import dotenv from 'dotenv';
import EsewaTransaction from '../models/EsewaTransaction.js';
import Appointment from '../models/Appointment.js';
import { format } from 'date-fns';
import crypto from 'crypto';

dotenv.config();




export const initiateEsewaPayment = async (req, res) => {
  const bookingId = req.params.id;
  console.log('📦 Booking ID received for payment:', bookingId);

  try {
    const appointment = await Appointment.findById(bookingId);
    if (!appointment) {
      console.warn('⚠️ Appointment not found for ID:', bookingId);
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const amount = 500;
    const taxAmount = 0;
    const serviceCharge = 0;
    const deliveryCharge = 0;
    const totalAmount = amount + taxAmount + serviceCharge + deliveryCharge;

    const transaction_uuid = `${format(new Date(), 'yyMMdd-HHmmss')}-${bookingId}`;
    const product_code = "EPAYTEST";
    const signed_field_names = "total_amount,transaction_uuid,product_code";

    const secretKey = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
    const signatureBase = `total_amount=${totalAmount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
    const signature = crypto.createHmac('sha256', secretKey)
      .update(signatureBase)
      .digest('base64');

    console.log('🧾 eSewa Payment Details:');
    console.log('  - Amount:', amount);
    console.log('  - Total Amount:', totalAmount);
    console.log('  - Transaction UUID:', transaction_uuid);
    console.log('  - Signature Base:', signatureBase);
    console.log('  - Generated Signature:', signature);

    const nonce = crypto.randomBytes(16).toString('base64');
    res.setHeader("Content-Security-Policy", `script-src 'self' 'nonce-${nonce}'`);

    const esewaFormHtml = `
      <html>
        <head>
          <title>Redirecting to eSewa...</title>
        </head>
        <body>
          <form id="esewaForm" method="POST" action="https://rc-epay.esewa.com.np/api/epay/main/v2/form" >
            <input type="hidden" name="amount" value="${amount}" />
            <input type="hidden" name="tax_amount" value="${taxAmount}" />
            <input type="hidden" name="product_service_charge" value="${serviceCharge}" />
            <input type="hidden" name="product_delivery_charge" value="${deliveryCharge}" />
            <input type="hidden" name="total_amount" value="${totalAmount}" />
            <input type="hidden" name="transaction_uuid" value="${transaction_uuid}" />
            <input type="hidden" name="product_code" value="${product_code}" />
            <input type="hidden" name="success_url" value="${process.env.BASE_URL}/api/payment/esewa/success" />
            <input type="hidden" name="failure_url" value="${process.env.BASE_URL}/api/payment/esewa/failure" />
            <input type="hidden" name="signed_field_names" value="${signed_field_names}" />
            <input type="hidden" name="signature" value="${signature}" />
          </form>

          <script nonce="${nonce}">
            document.getElementById('esewaForm').submit();
          </script>
        </body>
      </html>
    `;

    res.send(esewaFormHtml);

  } catch (err) {
    console.error('❌ Error initiating payment:', err);
    return res.status(500).json({ success: false, message: 'Payment initiation failed' });
  }
};


/**
 * Handle eSewa Success Redirect
 */
export const handleEsewaSuccess = async (req, res) => {
  const { amt, pid, refId } = req.query;

  try {
    const appointment = await Appointment.findById(pid);

    if (!appointment) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment-failure`);
    }

    const existing = await EsewaTransaction.findOne({ pid });

    if (!existing) {
      await EsewaTransaction.create({
        appointmentId: appointment._id,
        pid,
        amount: amt,
        status: 'Success',
        raw: req.query
      });

      // Optional: Update appointment status
      appointment.status = 'paid';
      await appointment.save();
    }

    return res.redirect(`${process.env.FRONTEND_URL}/payment-success`);
  } catch (err) {
    console.error('Error processing payment success:', err);
    return res.redirect(`${process.env.FRONTEND_URL}/payment-failure`);
  }
};

/**
 * Handle eSewa Failure Redirect
 */
export const handleEsewaFailure = async (req, res) => {
  const { pid } = req.query;

  try {
    if (pid) {
      const appointment = await Appointment.findById(pid);
      if (appointment) {
        await Appointment.findByIdAndDelete(pid);
        console.log(`🗑️ Deleted appointment with ID: ${pid} due to payment failure.`);
      } else {
        console.warn(`⚠️ No appointment found with ID: ${pid} on payment failure.`);
      }
    } else {
      console.warn('⚠️ No appointment ID (pid) provided in eSewa failure redirect.');
    }
  } catch (error) {
    console.error('❌ Error handling eSewa failure:', error);
  }

  res.redirect(`${process.env.FRONTEND_URL}/payment-failure`);
};

//check payment status
export const checkPaymentStatus = async (req, res) => {
  const { uuid } = req.params;

  try {
    const transaction = await EsewaTransaction.findOne({ pid: uuid })
      .populate({
        path: 'appointmentId',
        populate: [
          { path: 'userId', select: 'name email' },
          { path: 'vetId', select: 'name email' },
          { path: 'petId', select: 'name species breed' }
        ]
      });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    return res.json({
      success: true,
      data: {
        pid: transaction.pid,
        amount: transaction.amount,
        status: transaction.status,
        createdAt: transaction.createdAt,
        appointment: transaction.appointmentId
      }
    });
  } catch (err) {
    console.error('Error checking payment status:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};