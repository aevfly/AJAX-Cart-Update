<?php

namespace Drupal\ajax_cart_update\Controller;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Ajax\ReplaceCommand;
use Drupal\Core\Controller\ControllerBase;
use Drupal\commerce_cart\CartProviderInterface;
use Drupal\Core\Render\RendererInterface;
use Drupal\Core\Language\LanguageManagerInterface;
use Drupal\commerce_order\Entity\OrderInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * Provides AJAX endpoints for cart updates.
 */
class AjaxCartUpdateController extends ControllerBase {

  /**
   * The cart provider.
   *
   * @var \Drupal\commerce_cart\CartProviderInterface
   */
  protected $cartProvider;

  /**
   * The renderer.
   *
   * @var \Drupal\Core\Render\RendererInterface
   */
  protected $renderer;

  /**
   * The language manager.
   *
   * @var \Drupal\Core\Language\LanguageManagerInterface
   */
  protected $languageManager;

  /**
   * Constructs a new AjaxCartUpdateController object.
   *
   * @param \Drupal\commerce_cart\CartProviderInterface $cart_provider
   *   The cart provider.
   * @param \Drupal\Core\Render\RendererInterface $renderer
   *   The renderer.
   * @param \Drupal\Core\Language\LanguageManagerInterface $language_manager
   *   The language manager.
   */
  public function __construct(CartProviderInterface $cart_provider, RendererInterface $renderer, LanguageManagerInterface $language_manager) {
    $this->cartProvider = $cart_provider;
    $this->renderer = $renderer;
    $this->languageManager = $language_manager;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('commerce_cart.cart_provider'),
      $container->get('renderer'),
      $container->get('language_manager')
    );
  }

  /**
   * Updates the cart and returns AJAX commands.
   */
  public function updateCart(Request $request): AjaxResponse {
    $response = new AjaxResponse();
    $form_data = $request->request->all();

    // Check if edit_quantity exists in the form.
    if (empty($form_data['edit_quantity'])) {
      return $response;
    }

    $carts = $this->cartProvider->getCarts();

    $updated = FALSE;
    // Handle the different ways edit_quantity might be structured.
    $quantities = $form_data['edit_quantity'];

    // If quantities is a numerically indexed array, map it to order items.
    $is_numeric_indexed = array_keys($quantities) === range(0, count($quantities) - 1);

    foreach ($carts as $cart) {

      if ($cart instanceof OrderInterface && $cart->hasItems()) {
        $order_items = $cart->getItems();

        foreach ($order_items as $index => $order_item) {
          $item_id = $order_item->id();

          // Handle both associative and numeric arrays.
          $new_quantity = NULL;

          if ($is_numeric_indexed && isset($quantities[$index]) && is_numeric($quantities[$index])) {
            // If numeric indexed, use the array index.
            $new_quantity = (float) $quantities[$index];
          }
          elseif (isset($quantities[$item_id]) && is_numeric($quantities[$item_id])) {
            // If associative, use the item_id as key.
            $new_quantity = (float) $quantities[$item_id];
          }

          if ($new_quantity !== NULL && $new_quantity >= 0) {
            $order_item->setQuantity($new_quantity);
            try {
              $order_item->save();
              $updated = TRUE;
            }
            catch (\Exception $e) {
              \Drupal::logger('ajax_cart_update')->error('Failed to save order item @id: @error', [
                '@id' => $item_id,
                '@error' => $e->getMessage(),
              ]);
            }
          }
          else {
            \Drupal::logger('ajax_cart_update')->warning('Invalid or missing quantity for item @id.', [
              '@id' => $item_id,
            ]);
          }
        }

        if ($updated) {
          try {
            $cart->save();
            // Clear cart cache.
            \Drupal::service('cache_tags.invalidator')->invalidateTags(['commerce_order:' . $cart->id()]);
          }
          catch (\Exception $e) {
            $this->logger('ajax_cart_update')->error('Failed to save cart @id: @error.', [
              '@id' => $cart->id(),
              '@error' => $e->getMessage(),
            ]);
          }
        }
      }
    }

    // Return updated HTML for order summary.
    foreach ($carts as $cart) {
      if ($cart instanceof OrderInterface) {
        $order_total_summary = [
          '#theme' => 'commerce_order_total_summary',
          '#totals' => [
            'subtotal' => $cart->getSubtotalPrice() ? [
              'number' => $cart->getSubtotalPrice()->getNumber(),
              'currency_code' => $cart->getSubtotalPrice()->getCurrencyCode(),
            ] : [],
            'total' => $cart->getTotalPrice() ? [
              'number' => $cart->getTotalPrice()->getNumber(),
              'currency_code' => $cart->getTotalPrice()->getCurrencyCode(),
            ] : [],
          ],
        ];
        $rendered_summary = $this->renderer->renderPlain($order_total_summary);
        $response->addCommand(new ReplaceCommand('[data-drupal-selector="order-total-summary"]', $rendered_summary));

        // Update item prices.
        foreach ($cart->getItems() as $order_item) {
          $total_price = $order_item->getTotalPrice();

          if ($total_price) {
            $price_render = [
              '#type' => 'inline_template',
              '#template' => '{{ price|commerce_price_format }}',
              '#context' => ['price' => $total_price],
            ];
            $rendered_price = $this->renderer->renderPlain($price_render);
            $response->addCommand(new ReplaceCommand(".views-field-total-price__number[data-order-item-id='{$order_item->id()}']", $rendered_price));
          }
        }
        break;
      }
    }

    return $response;
  }

  /**
   * Returns cart summary HTML as JSON.
   *
   * @return \Symfony\Component\HttpFoundation\JsonResponse
   *   The JSON response containing cart summary HTML.
   */
  public function getCartSummaryHtml(): JsonResponse {
    $current_language = $this->languageManager->getCurrentLanguage()->getId();
    $this->languageManager->setConfigOverrideLanguage($this->languageManager->getLanguage($current_language));

    $carts = $this->cartProvider->getCarts();

    $response = [
      'order_total_summary' => '',
      'item_prices' => [],
      'items' => [],
      'total_quantity' => 0,
      'order_total' => '',
      'order_subtotal' => '',
    ];

    if (empty($carts)) {
      return new JsonResponse($response, 200, ['Content-Type' => 'application/json']);
    }

    foreach ($carts as $cart) {

      if ($cart instanceof OrderInterface) {
        $totals = [
          'subtotal' => [],
          'total' => [],
        ];

        $subtotal_price = $cart->getSubtotalPrice();
        $total_price = $cart->getTotalPrice();

        if ($subtotal_price) {
          $totals['subtotal'] = [
            'number' => $subtotal_price->getNumber(),
            'currency_code' => $subtotal_price->getCurrencyCode(),
          ];
          $subtotal_render = [
            '#type' => 'inline_template',
            '#template' => '{{ price|commerce_price_format }}',
            '#context' => ['price' => $subtotal_price],
          ];
          $response['order_subtotal'] = $this->renderer->renderPlain($subtotal_render);
        }

        if ($total_price) {
          $totals['total'] = [
            'number' => $total_price->getNumber(),
            'currency_code' => $total_price->getCurrencyCode(),
          ];
          $total_render = [
            '#type' => 'inline_template',
            '#template' => '{{ price|commerce_price_format }}',
            '#context' => ['price' => $total_price],
          ];
          $response['order_total'] = $this->renderer->renderPlain($total_render);
        }

        $order_total_summary = [
          '#theme' => 'commerce_order_total_summary',
          '#totals' => $totals,
        ];
        $rendered_summary = $this->renderer->renderPlain($order_total_summary);

        $wrapped_summary = [
          '#type' => 'container',
          '#attributes' => [
            'class' => [
              'field',
              'field--name-total-price',
              'field--type-commerce-price',
              'field--label-hidden',
              'field--item',
            ],
          ],
          'content' => [
            '#markup' => $rendered_summary,
          ],
        ];
        $response['order_total_summary'] = $this->renderer->renderPlain($wrapped_summary);

        if ($cart->hasItems()) {
          $total_quantity = 0;
          foreach ($cart->getItems() as $order_item) {
            $total_quantity += $order_item->getQuantity();
            $total_price = $order_item->getTotalPrice();

            if ($total_price) {
              $price_render = [
                '#type' => 'inline_template',
                '#template' => '{{ price|commerce_price_format }}',
                '#context' => ['price' => $total_price],
              ];
              $response['item_prices'][] = $this->renderer->renderPlain($price_render);
            }
            else {
              $response['item_prices'][] = '';
            }
            $response['items'][] = [
              'order_item_id' => $order_item->id(),
              'quantity' => $order_item->getQuantity(),
              'title' => $order_item->getTitle(),
            ];
          }
          $response['total_quantity'] = $total_quantity;

        }
      }
    }

    return new JsonResponse($response, 200, ['Content-Type' => 'application/json']);
  }

}
