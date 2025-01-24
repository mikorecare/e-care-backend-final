const cron = require('node-cron');
const Appointment = require('../models/appointment');  // Path to your Appointment model
const Notification = require('../models/notification');  // Path to your Notification model

// Schedule the task to run every day at 4 AM
cron.schedule('0 4 * * *', async () => {
  try {
    const today = new Date();
    const appointmentDay = new Date(today.setHours(0, 0, 0, 0));  // Set to midnight today
    const targetDay = new Date(appointmentDay); 
    targetDay.setDate(targetDay.getDate() + 1);  // Set to the next day (the scheduled appointment date)

    // Find all appointments that are scheduled for 'tomorrow'
    const appointments = await Appointment.find({
      date: { $gte: targetDay, $lt: new Date(targetDay.getTime() + 24 * 60 * 60 * 1000) } // check appointments within the next day range
    });

    // Send notifications for each appointment found
    for (const appointment of appointments) {
      await createNotification(appointment.userId, 'Today is your Appointment', `You have an appointment scheduled for today at ${appointment.time}.`);
    }

    console.log('Appointment day notifications sent successfully.');
  } catch (error) {
    console.error('Error sending appointment day notifications:', error);
  }
});
