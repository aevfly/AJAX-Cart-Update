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
      const formData = $formElement.serialize();

      timeout = setTimeout(() => {
        // Gather form data manually
        const formValues = {};
        const formInputs = $formElement.find('input, select, textarea').not('[type="file"]');

        formInputs.each(function () {
          const input = $(this);
          const name = input.attr('name');
          if (name) {
            if (input.attr('type') === 'checkbox' || input.attr('type') === 'radio') {
              if (input.prop('checked')) {
                formValues[name] = input.val();
              }
            } else {
              formValues[name] = input.val();
            }
          }
        });

        // Direct AJAX request
        $.ajax({
          url: langPrefix + '/ajax/cart/update',
          type: 'POST',
          data: formValues,
          beforeSend: function () {
            $self.before('<div class="ajax-progress ajax-progress-throbber"><div class="throbber">&nbsp;</div></div>');
          },
          complete: function () {
            $formElement.find('.ajax-progress').remove();
          },
          success: function (response) {
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
                  if (data.item_prices && data.item_prices.length) {
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
                    $(selectors.cart_block_summary_count).text(`${ itemCount } ${ itemText }`);
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

      // Get selectors from drupalSettings or fallback to defaults.
      const itemText = (drupalSettings.ajaxCartUpdate && drupalSettings.ajaxCartUpdate.translations && drupalSettings.ajaxCartUpdate.translations.items) || Drupal.t('items');
      // Get the current language prefix (e.g., '/uk' or '/es').
      const currentPath = window.location.pathname;
      const langPrefixMatch = currentPath.match(/^\/([a-z]{2})\//);
      const langPrefix = langPrefixMatch ? ` / ${ langPrefixMatch[1] }` : '';

      $forms.each((index, form) => {
        const $form = $(form);

        // Apply once to prevent multiple bindings.
        once('ajaxCartUpdateEndpoint', $form).forEach((formElement) => {
          initializeCartForm($(formElement), selectors, langPrefix);
        });
      });
    },
  };

  // Re-attach behavior after Big Pipe or AJAX events.
  $(document).on('drupal:big_pipe:complete drupalAjaxSuccess', () => {
    Drupal.behaviors.ajaxCartUpdateEndpoint.attach(document);
  });
})(jQuery, Drupal, once);
