import React from 'react';

const KhaltiButton = () => {
  const loadKhalti = () => {
    const config = {
      publicKey: 'test_public_key_xxxxxx', // Replace with your actual key
      productIdentity: '1234567890',
      productName: 'Doctor Appointment',
      productUrl: 'http://yourapp.com/appointment/123',
      eventHandler: {
        onSuccess(payload) {
          console.log('Khalti Success:', payload);

          // 🔽 This is the fetch call you mentioned — place it here:
          fetch('http://localhost:5555/api/payments/verify-khalti', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              token: payload.token,
              amount: payload.amount
            })
          })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                alert('✅ Payment successful!');
                // TODO: Optionally update appointment status or navigate
              } else {
                alert('❌ Payment verification failed');
              }
            })
            .catch(err => {
              console.error('Fetch error:', err);
              alert('Something went wrong!');
            });
        },

        onError(error) {
          console.error('Khalti Error:', error);
        },

        onClose() {
          console.log('Khalti widget closed');
        }
      }
    };

    const checkout = new window.KhaltiCheckout(config);
    checkout.show({ amount: 1000 }); // Amount in paisa (e.g. 1000 = Rs. 10.00)
  };

  return (
    <button onClick={loadKhalti} className="bg-purple-600 text-white px-4 py-2 rounded">
      Pay with Khalti
    </button>
  );
};

export default KhaltiButton;
