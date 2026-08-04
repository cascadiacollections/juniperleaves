import './site.css';
import './404.html';
import './browserconfig.xml';
import './favicon.ico';
import './humans.txt';
import './icon.png';
import './robots.txt';
import './site.webmanifest';
import './tile-wide.png';
import './tile.png';

interface PayPalActions {
  order: {
    create: (order: PayPalOrder) => Promise<string>;
    capture: () => Promise<PayPalOrderDetails>;
  };
}

interface PayPalOrder {
  purchase_units: Array<{
    amount: {
      currency_code: 'USD';
      value: string;
      breakdown: {
        item_total: {
          currency_code: 'USD';
          value: string;
        };
      };
    };
    items: Array<{
      name: string;
      sku: string;
      quantity: string;
      unit_amount: {
        currency_code: 'USD';
        value: string;
      };
    }>;
  }>;
}

interface PayPalOrderDetails {
  payer: {
    name: {
      given_name: string;
    };
  };
}

interface PayPal {
  Buttons: (options: {
    createOrder: (_data: unknown, actions: PayPalActions) => Promise<string>;
    onApprove: (_data: unknown, actions: PayPalActions) => Promise<PayPalOrderDetails>;
  }) => {
    render: (selector: string) => Promise<void>;
  };
}

declare const paypal: PayPal;

const UNIT_PRICE = 15;
const quantityInput = document.getElementById('order_quantity') as HTMLInputElement;
const sizeInput = document.getElementById('order_size') as HTMLSelectElement;

function getQuantity(): number {
  const quantity = Number(quantityInput.value);

  if (!isFinite(quantity) || Math.floor(quantity) !== quantity || quantity < 1 || quantity > 100) {
    throw new Error('Please select a quantity between 1 and 100.');
  }

  return quantity;
}

paypal.Buttons({
  createOrder: (_data, actions) => {
    const quantity = getQuantity();
    const total = (UNIT_PRICE * quantity).toFixed(2);

    return actions.order.create({
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: total,
          breakdown: {
            item_total: {
              currency_code: 'USD',
              value: total
            }
          }
        },
        items: [{
          name: `Buffalo plaid dog bandana (${sizeInput.value})`,
          sku: `BPD-${sizeInput.value.toUpperCase().replace('-', '_')}`,
          quantity: quantity.toString(),
          unit_amount: {
            currency_code: 'USD',
            value: UNIT_PRICE.toFixed(2)
          }
        }]
      }]
    });
  },
  onApprove: (_data, actions) => actions.order.capture().then((details) => {
    window.alert(`Transaction completed by ${details.payer.name.given_name}`);
    return details;
  })
}).render('#paypal-button-container');
