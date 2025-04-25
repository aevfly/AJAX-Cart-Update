<?php

namespace Drupal\ajax_cart_update\Form;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Config\TypedConfigManagerInterface;
use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;

/**
 * Configuration form for AJAX Cart Update settings.
 */
class AjaxCartUpdateSettingsForm extends ConfigFormBase {

  /**
   * The typed config manager.
   *
   * @var \Drupal\Core\Config\TypedConfigManagerInterface
   */
  protected $typedConfigManager;

  /**
   * Constructs a new AjaxCartUpdateSettingsForm.
   *
   * @param \Drupal\Core\Config\ConfigFactoryInterface $config_factory
   *   The config factory.
   * @param \Drupal\Core\Config\TypedConfigManagerInterface $typed_config_manager
   *   The typed config manager.
   */
  public function __construct(ConfigFactoryInterface $config_factory, TypedConfigManagerInterface $typed_config_manager) {
    parent::__construct($config_factory);
    $this->typedConfigManager = $typed_config_manager;
  }

  /**
   * {@inheritdoc}
   */
  public static function create($container) {
    return new static(
      $container->get('config.factory'),
      $container->get('config.typed')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'ajax_cart_update_settings';
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames() {
    return ['ajax_cart_update.settings'];
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {
    $config = $this->config('ajax_cart_update.settings');

    $form['update_method'] = [
      '#type' => 'radios',
      '#title' => $this->t('Cart update method'),
      '#description' => $this->t('Choose how the cart totals and prices are updated.'),
      '#options' => [
        'selectors' => $this->t('Use selectors from Views'),
        'endpoint' => $this->t('Use AJAX endpoint for HTML'),
      ],
      '#default_value' => $config->get('update_method') ?: 'selectors',
    ];

    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    $this->config('ajax_cart_update.settings')
      ->set('update_method', $form_state->getValue('update_method'))
      ->save();

    parent::submitForm($form, $form_state);
  }

}
