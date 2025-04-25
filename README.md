# AJAX Cart Update

## Overview
The **AJAX Cart Update** module enhances the Drupal Commerce cart form by providing AJAX-based functionality to dynamically update item quantities and order totals without requiring a full page reload. This improves the user experience by making cart interactions faster and more seamless.

The module supports two update methods:
- **Selectors**: Updates cart elements using predefined CSS selectors extracted from the Views render array.
- **Endpoint**: Uses an AJAX endpoint to fetch and update cart summary HTML.

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
   - **Use AJAX endpoint for HTML**: Fetches updated HTML via an AJAX endpoint for more complex cart layouts.
3. Save the configuration.

## Usage
- The module automatically enhances the Commerce cart form (typically found at `/cart`).
- When users change item quantities in the cart, the module updates the following elements in real-time:
  - Order total and subtotal.
  - Item prices in the cart table.
  - Cart block summary (e.g., item count and quantities in the cart block).
- The module supports multilingual sites by handling language prefixes in AJAX URLs (e.g., `/en/cart`, `/uk/cart`).

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
- `/ajax/cart/update`: Updates the cart quantities and returns AJAX commands.
- `/ajax/cart/summary-html`: Returns cart summary HTML as JSON (used in endpoint mode).

### JavaScript
The module includes two JavaScript files:
- `js/ajax-cart-selectors.js`: Handles updates using CSS selectors.
- `js/ajax-cart-endpoint.js`: Handles updates via the AJAX endpoint.

### Extending the Module
Developers can customize the module by:
- Modifying selectors in `ajax_cart_update_preprocess_views_view()` to target different elements.
- Overriding the `views-view--commerce-cart-form.html.twig` template for custom cart form layouts.
- Adding custom AJAX commands in `AjaxCartUpdateController.php`.

## Troubleshooting
- If AJAX updates do not work, ensure that:
  - The Commerce cart form is rendered using the Views module.
  - JavaScript libraries (`core/jquery`, `core/drupal.ajax`, etc.) are properly loaded.
  - The correct update method is selected in the module settings.
- Check the browser console for JavaScript errors and the Drupal logs for PHP errors.
- Verify that the cart block and cart form selectors match the theme's markup.

## Support
- Report issues or suggest features in the [Drupal.org issue queue](https://www.drupal.org/project/issues/ajax_cart_update).
- Contribute patches or improvements via the module's Git repository.

## License
This module is licensed under the GNU General Public License, version 2 or later (GPLv2+). See the `LICENSE.txt` file for details.