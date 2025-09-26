import express from 'express';
import { initiateEsewaPayment, handleEsewaSuccess, handleEsewaFailure, checkPaymentStatus } from '../controllers/esewaController.js';

const esewaRouter = express.Router();

esewaRouter.get('/pay/:id', initiateEsewaPayment); // param name: id
esewaRouter.get('/success', handleEsewaSuccess);
esewaRouter.get('/failure', handleEsewaFailure);
esewaRouter.get('/payment/esewa/status/:uuid', checkPaymentStatus);

export default esewaRouter;