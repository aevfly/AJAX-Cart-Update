(function ($, Drupal, once) {
  'use strict';

  /**
   * Shared utility to initialize cart form and handle quantity changes.
   *
   * @param {jQuery} $formElement - The cart form element.
   * @param {Object} settings - Settings including selectors and custom endpoints.
   * @param {string} langPrefix - Language prefix for AJAX URL.
   *
   */
  function initializeCartForm($formElement, settings, langPrefix) {
    let timeout;
    const initialValues = {};

    // Store initial values of form fields.
    $formElement.find('input, select, textarea').not('[type="file"]').each(function () {
      const $input = $(this);
      const name = $input.attr('name');
      if (name) {
        initialValues[name] = $input.attr('type') === 'checkbox' || $input.attr('type') === 'radio'
          ? $input.prop('checked')
          : $input.val();
      }
    });

    $formElement.find('input[name^="edit_quantity"]').on('change', function () {
      clearTimeout(timeout);
      const $self = $(this);

      if (!$.isNumeric(quantity) || quantity < 0) {
        return;
      }

      const changedData = {};

      // Collect only changed fields.
      $formElement.find('input, select, textarea').not('[type="file"]').each(function () {
        const $input = $(this);
        const name = $input.attr('name');
        if (name) {
          const currentValue = $input.attr('type') === 'checkbox' || $input.attr('type') === 'radio'
            ? $input.prop('checked')
            : $input.val();
          if (currentValue !== initialValues[name]) {
            changedData[name] = currentValue;
          }
        }
      });

      // If no changes, skip the request.
      if (Object.keys(changedData).length === 0) {
        return;
      }

      timeout = setTimeout(() => {
        // Default AJAX request to update cart.
        $.ajax({
          url: langPrefix + '/ajax/cart/update',
          type: 'POST',
          data: changedData,
          beforeSend: function () {
            $self.before('<div class="ajax-progress ajax-progress-throbber"><div class="throbber">&nbsp;</div></div>');
          },
          complete: function () {
            $formElement.find('.ajax-progress').remove();
          },
          success: function (response) {
            // Update initial values with new data.
            Object.keys(changedData).forEach(name => {
              initialValues[name] = changedData[name];
            });

            // Process custom endpoints or default summary.
            const endpoints = settings.customEndpoints || {
              summary: {
                url: langPrefix + '/ajax/cart/summary-html',
                selectors: settings.selectors
              }
            };

            const updatePromises = Object.keys(endpoints).map(key => {
              const endpoint = endpoints[key];
              return $.ajax({
                url: endpoint.url,
                dataType: 'json',
                success: (data) => {

                  // Update DOM elements based on selectors.
                  if (endpoint.selectors) {
                    Object.keys(endpoint.selectors).forEach(selectorKey => {
                      const selector = endpoint.selectors[selectorKey];
                      const $elements = $(selector);

                      // Handle scalar and array data.
                      if (Array.isArray(data[selectorKey])) {
                        if ($elements.length === data[selectorKey].length) {
                          $elements.each((i, element) => {
                            if (data[selectorKey][i]) {
                              $(element).html(data[selectorKey][i]);
                            }
                          });
                        }
                      } else if (data[selectorKey]) {
                        if ($elements.length) {
                          $elements.html(data[selectorKey]);
                        }
                      }
                    });
                  }

                  // Update cart block if applicable.
                  if (data.total_quantity !== undefined && endpoint.selectors.cart_block_summary_count) {
                    const itemCount = data.total_quantity;
                    const itemText = (settings.translations && settings.translations.items) ? settings.translations.items : Drupal.t('items');
                    const $countElements = $(endpoint.selectors.cart_block_summary_count);
                    if ($countElements.length) {
                      $countElements.text(`${itemCount} ${itemText}`);
                    }
                  }

                  // Update cart block items.
                  if (data.items && data.items.length && endpoint.selectors.cart_block_quantity) {
                    const $quantityElements = $(endpoint.selectors.cart_block_quantity);
                    const $titleElements = $(endpoint.selectors.cart_block_title);
                    const $priceElements = $(endpoint.selectors.cart_block_price);

                    if (data.items.length === $quantityElements.length) {
                      $quantityElements.each((i, element) => {
                        if (data.items[i]) {
                          $(element).text(`${data.items[i].quantity} ${Drupal.t('x')}`);
                        }
                      });
                      $titleElements.each((i, element) => {
                        if (data.items[i]) {
                          $(element).text(data.items[i].title);
                        }
                      });
                      $priceElements.each((i, element) => {
                        if (data.item_prices && data.item_prices[i]) {
                          $(element).html(data.item_prices[i]);
                        }
                      });
                    }
                  }

                  // Trigger event for client-side frameworks (Vue.js, React, etc.).
                  $(document).trigger('ajaxCartUpdate:endpointUpdated', { endpoint: key, data });
                },
                error: function (xhr, status, error) {
                  // console.error(`Error fetching ${endpoint.url}:`, status, error);
                }
              });
            });

            // Wait for all endpoint updates to complete.
            Promise.all(updatePromises).then(() => {
              // Trigger general cart update event.
              $(document).trigger('commerce_cart_updated');
            });
          },
          error: function (xhr, status, error) {
            console.error('AJAX cart update error:', status, error);
          }
        });
      }, 500);
    });
  }

  /**
   * AJAX Cart Update behavior for endpoint mode.
   */
  Drupal.behaviors.ajaxCartUpdateEndpoint = {
    attach: function (context) {
      const $forms = $('[data-drupal-selector^="views-form-commerce-cart-form"], form[id^="views-form-commerce-cart-form"]', context);

      if (!$forms.length) {
        return;
      }

      // Get settings from drupalSettings.
      const settings = drupalSettings.ajaxCartUpdate || {};
      //console.log('Endpoint settings:', settings);

      // Get the current language prefix (e.g., '/uk' or '/es').
      const currentPath = window.location.pathname;
      const langPrefixMatch = currentPath.match(/^\/([a-z]{2})\//);
      let langPrefix = '';

      if (langPrefixMatch) {
        langPrefix = '/' + langPrefixMatch[1];
      }

      $forms.each((index, form) => {
        const $form = $(form);

        // Apply once to prevent multiple bindings.
        once('ajaxCartUpdateEndpoint', $form).forEach((formElement) => {
          initializeCartForm($(formElement), settings, langPrefix);
        });
      });
    },
  };

  // Re-attach behavior after Big Pipe or AJAX events.
  $(document).on('drupal:big_pipe:complete drupalAjaxSuccess', () => {
    Drupal.behaviors.ajaxCartUpdateEndpoint.attach(document);
  });
})(jQuery, Drupal, once);
