declare var paypal;

paypal.Buttons({
    createOrder: function(data, actions) {
      const quantity = parseInt((document.getElementById('order_quantity')! as HTMLInputElement).value, 10);

      return actions.order.create({
        purchase_units: [{
          amount: {
            value: 15.00 * quantity
          },
          items: [
            { name: 'Buffalo plaid dog bandana', quantity: quantity }
          ]
        }]
      });
    },
    onApprove: function(data, actions) {
      return actions.order.capture().then(function(details) {
        window.alert('Transaction completed by ' + details.payer.name.given_name);
      });
    }
}).render('#paypal-button-container');
