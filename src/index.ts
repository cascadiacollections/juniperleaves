// tslint:disable-next-line:no-any
declare var paypal: any;

paypal.Buttons({
    createOrder: (data, actions) => {
      const quantity: number = parseInt((document.getElementById('order_quantity') as HTMLInputElement).value, 10);

      return actions.order.create({
        purchase_units: [{
          amount: {
            value: 15.00 * quantity
          },
          items: [
            { name: 'Buffalo plaid dog bandana', quantity }
          ]
        }]
      });
    },
    onApprove: (data, actions) => {
      return actions.order.capture().then((details) => {
        window.alert(`Transaction completed by ${details.payer.name.given_name}`);
      });
    }
}).render('#paypal-button-container');
