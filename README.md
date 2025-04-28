# AJAX Cart Update

[![Drupal 10 ready](https://img.shields.io/badge/Drupal%2010-ready-28a745.svg)](https://www.drupal.org/project/ajax_cart_update)
[![License: GPL v2](https://img.shields.io/badge/License-GPLv2-blue.svg)](LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/aevfly/AJAX-Cart-Update.svg)](https://github.com/aevfly/AJAX-Cart-Update/issues)
[![Last commit](https://img.shields.io/github/last-commit/aevfly/AJAX-Cart-Update.svg)](https://github.com/aevfly/AJAX-Cart-Update/commits/main)
[![GitHub stars](https://img.shields.io/github/stars/aevfly/AJAX-Cart-Update?style=social)](https://github.com/aevfly/AJAX-Cart-Update)

---

## Overview
The **AJAX Cart Update** module enhances the Drupal Commerce cart form by providing AJAX-based functionality to dynamically update item quantities and order totals without requiring a full page reload. This improves the user experience by making cart interactions faster and more seamless.

The module supports two update methods:
- **Selectors**: Updates cart elements using predefined CSS selectors extracted from the Views render array.
- **Endpoint**: Uses configurable AJAX endpoints to fetch and update cart data, offering greater flexibility for complex layouts and integration with client-side frameworks like Vue.js or React.

This module is ideal for Drupal Commerce sites that need a responsive and modern cart experience.

## Requirements
- Drupal 9 or 10 (compatible with `^9 || ^10`).
- Drupal core modules:
  - Views (`drupal:views`)
- Drupal Commerce modules:
  - Commerce Cart (`commerce:commerce_cart`)

## Installation
1. Download the module from [Drupal.org](https://www.drupal.org/project/ajax_cart_update) or via Composer:
   ```bash
   composer require 'drupal/ajax_cart_update'
   ```
2. Enable the module using Drush or the Drupal admin interface:
   ```bash
   drush en ajax_cart_update
   ```
   Or navigate to `/admin/modules` and enable **AJAX Cart Update**.

## Configuration
1. Navigate to the module's settings page at `/admin/config/ajax-cart-update/settings`.
2. Choose the **Cart update method**:
   - **Use selectors from Views**: Updates cart totals and prices using CSS selectors. Suitable for most setups.
   - **Use AJAX endpoint for HTML**: Fetches updated data via configurable AJAX endpoints for more complex cart layouts or client-side framework integration.
3. Save the configuration.

## Usage
- The module automatically enhances the Commerce cart form (typically found at `/cart`).
- When users change item quantities in the cart, the module updates the following elements in real-time:
  - Order total and subtotal.
  - Item prices in the cart table.
  - Cart block summary (e.g., item count and quantities in the cart block).
- The module supports multilingual sites by handling language prefixes in AJAX URLs (e.g., `/en/cart`, `/uk/cart`).

### Custom Endpoints (Endpoint Mode)
The **Endpoint** mode supports multiple configurable AJAX endpoints for updating specific parts of the cart, such as prices, order summaries, or cart block content. These endpoints are defined in `drupalSettings.ajaxCartUpdate.customEndpoints`. Each endpoint includes:
- A unique URL (e.g., `/ajax/cart/summary-html`, `/ajax/cart/prices`).
- A set of CSS selectors for updating specific DOM elements.

If no custom endpoints are defined, the module defaults to `/ajax/cart/summary-html`.

The module triggers the `ajaxCartUpdate:endpointUpdated` event after each endpoint update, passing the endpoint name and response data. This allows client-side frameworks like Vue.js or React to update their component state. Example usage:

```javascript
$(document).on('ajaxCartUpdate:endpointUpdated', (event, { endpoint, data }) => {
  if (endpoint === 'summary') {
    // Update Vue.js/React state with cart summary data
    console.log('Cart summary updated:', data);
  } else if (endpoint === 'prices') {
    // Update prices in the component
    console.log('Cart prices updated:', data);
  }
});

## Permissions
- **Administer site configuration**: Required to access the module's settings page (`/admin/config/ajax-cart-update/settings`).
- **Access content**: Required for users to interact with the cart and trigger AJAX updates.

## Development
### Hooks
The module provides several hooks for customization:
- `hook_page_attachments()`: Attaches translations to `drupalSettings`.
- `hook_form_alter()`: Removes the default submit button from the Commerce cart form.
- `hook_preprocess_page()`: Attaches the appropriate AJAX library based on the update method.
- `hook_preprocess_views_view()`: Passes selectors to JavaScript for the cart form.

### AJAX Endpoints
- `/ajax/cart/update`: Updates cart quantities and returns AJAX commands.
- `/ajax/cart/summary-html`: Returns cart summary HTML as JSON (used in both modes).
- `/ajax/cart/prices`: Returns prices and related data as JSON (used in endpoint mode).

### JavaScript
The module includes two JavaScript files:
- `js/ajax-cart-selectors.js`: Handles updates using CSS selectors. Suitable for simple setups.
- `js/ajax-cart-endpoint.js`: Handles updates via configurable AJAX endpoints, with support for client-side validation and integration with frameworks like Vue.js or React.

### Extending the Module
Developers can customize the module by:
- Modifying selectors or custom endpoints in `ajax_cart_update_preprocess_views_view()` to target different elements or add new endpoints.
- Overriding the `views-view--commerce-cart-form.html.twig` template for custom cart form layouts.
- Adding custom AJAX commands in `AjaxCartUpdateController.php`.
- Listening to the `commerce_cart_updated` or `ajaxCartUpdate:endpointUpdated` events to integrate with client-side frameworks or perform additional updates.

Example of adding a custom endpoint:
```php
function mymodule_preprocess_views_view(&$variables) {
  if ($variables['view']->id() === 'commerce_cart_form') {
    $variables['#attached']['drupalSettings']['ajaxCartUpdate']['customEndpoints']['custom'] = [
      'url' => '/ajax/cart/custom-data',
      'selectors' => [
        'custom_field' => '.custom-cart-field',
      ],
    ];
  }
}
```

## Troubleshooting
- If AJAX updates do not work, ensure that:
  - The Commerce cart form is rendered using the Views module.
  - JavaScript libraries (`core/jquery`, `core/drupal.ajax`, etc.) are properly loaded.
  - The correct update method is selected in the module settings.
  - Quantity inputs contain valid numeric values (non-negative).
- Check the browser console for JavaScript errors (e.g., invalid selectors or endpoint failures) and the Drupal logs for PHP errors.
- Verify that the cart block and cart form selectors match the theme's markup.

## Support
- Report issues or suggest features in the [Drupal.org issue queue](https://www.drupal.org/project/issues/ajax_cart_update).
- Contribute patches or improvements via the module's Git repository.

## License
This module is licensed under the GNU General Public License, version 2 or later (GPLv2+). See the `LICENSE.txt` file for details.
