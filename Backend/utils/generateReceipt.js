// utils/generateReceipt.js
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export function generateReceipt(appointment, user, vet, outputPath) {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(outputPath));

  doc.fontSize(20).text('VetGoNow Payment Receipt', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Appointment ID: ${appointment._id}`);
  doc.text(`User: ${user.name}`);
  doc.text(`Vet: Dr. ${vet.name}`);
  doc.text(`Date: ${new Date(appointment.appointmentDate).toDateString()}`);
  doc.text(`Amount Paid: Rs. 500`);
  doc.text(`Status: Paid`);
  doc.text(`Transaction Ref: ${appointment.paymentRefId || 'N/A'}`);
  doc.end();
}
