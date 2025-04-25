(function ($, Drupal, once) {
  'use strict';

  /**
   * Shared utility to initialize cart form and handle quantity changes.
   *
   * @param {jQuery} $formElement - The cart form element.
   * @param {Object} selectors - Selectors for cart elements.
   * @param {string} langPrefix - Language prefix for AJAX URL.
   */
  function initializeCartForm($formElement, selectors, langPrefix) {
    let timeout;

    $formElement.find('input[name^="edit_quantity"]').on('change', function () {
      clearTimeout(timeout);

      const $self = $(this);

      timeout = setTimeout(() => {

        $.ajax({
          url: langPrefix + '/ajax/cart/update',
          type: 'POST',
          data: $formElement.serialize(),
          beforeSend: function () {
            $self.before('<div class="ajax-progress ajax-progress-throbber"><div class="throbber">&nbsp;</div></div>');
          },
          complete: function () {
            $formElement.find('.ajax-progress').remove();
          },
          success: function (response) {
            // Wait a bit and then fetch the cart summary
            setTimeout(() => {
              $.ajax({
                url: langPrefix + '/ajax/cart/summary-html',
                dataType: 'json',
                success: (data) => {
                  // Update order total summary.
                  if (data.order_total_summary) {
                    $(selectors.order_total_summary).html(data.order_total_summary);
                  }

                  // Update item prices in main cart table.
                  if (data.item_prices) {
                    $(selectors.total_price_number).each((i, element) => {
                      if (data.item_prices[i]) {
                        $(element).html(data.item_prices[i]);
                      }
                    });
                  }

                  // Update order total.
                  if (data.order_total) {
                    $(selectors.order_total).html(data.order_total);
                  }

                  // Update order subtotal.
                  if (data.order_subtotal) {
                    $(selectors.order_subtotal).html(data.order_subtotal);
                  }

                  // Update cart block.
                  if (data.total_quantity !== undefined) {
                    const itemCount = data.total_quantity;
                    const itemText = (drupalSettings.ajaxCartUpdate && drupalSettings.ajaxCartUpdate.translations && drupalSettings.ajaxCartUpdate.translations.items) || Drupal.t('items');
                    $(selectors.cart_block_summary_count).text(`${itemCount} ${itemText}`);
                  }

                  if (data.items && data.items.length && data.item_prices && data.item_prices.length) {
                    $(selectors.cart_block_quantity).each((i, element) => {
                      if (data.items[i]) {
                        $(element).text(`${data.items[i].quantity} ${Drupal.t('x')}`);
                      }
                    });
                    $(selectors.cart_block_title).each((i, element) => {
                      if (data.items[i]) {
                        $(element).text(data.items[i].title);
                      }
                    });
                    $(selectors.cart_block_price).each((i, element) => {
                      if (data.item_prices[i]) {
                        $(element).html(data.item_prices[i]);
                      }
                    });
                  }

                  // Trigger an event that other modules can listen for
                  $(document).trigger('commerce_cart_updated');
                }
              });
            }, 500);
          },
          error: function (xhr, status, error) {
            console.error('AJAX cart update error:', status, error);
          }
        });

      }, 500);
    });
  }

  /**
   * AJAX Cart Update behavior selectors mode.
   */
  Drupal.behaviors.ajaxCartUpdateSelectors = {
    attach: function (context) {
      const $forms = $('[data-drupal-selector^="views-form-commerce-cart-form"], form[id^="views-form-commerce-cart-form"]', context);

      if (!$forms.length) {
        return;
      }

      // Get selectors from drupalSettings or fallback to defaults.
      const selectors = (drupalSettings.ajaxCartUpdate && drupalSettings.ajaxCartUpdate.selectors) || {};

      // Get the current language prefix (e.g., '/uk' or '/es').
      const currentPath = window.location.pathname;
      const langPrefixMatch = currentPath.match(/^\/([a-z]{2})\//);
      const langPrefix = langPrefixMatch ? ` / ${langPrefixMatch[1]}` : '';

      $forms.each((index, form) => {
        const $form = $(form);

        // Apply once to prevent multiple bindings.
        once('ajaxCartUpdateSelectors', $form).forEach((formElement) => {
          initializeCartForm($(formElement), selectors, langPrefix);
        });
      });
    },
  };

  // Re-attach behavior after Big Pipe or AJAX events.
  $(document).on('drupal:big_pipe:complete drupalAjaxSuccess', () => {
    Drupal.behaviors.ajaxCartUpdateSelectors.attach(document);
  });
})(jQuery, Drupal, once);
