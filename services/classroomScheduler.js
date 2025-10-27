const mongoose = require('mongoose');
const Classroom = require('../models/Classroom');
const cron = require('node-cron');

module.exports = () => {
    // Schedule tasks to run every minute
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();

            // Process deactivations
            const classroomsToDeactivate = await Classroom.find({
                isActive: true,
                'scheduledEvents.deactivationTime': { $lte: now }
            });

            for (const classroom of classroomsToDeactivate) {
                const event = classroom.scheduledEvents.find(e => new Date(e.deactivationTime) <= now);
                if (event) {
                    classroom.isActive = false;
                    classroom.notes = event.notes || `Đã tự động khóa vào ${now.toLocaleString('vi-VN')}`;
                    await classroom.save();
                    console.log(`Deactivated classroom: ${classroom.roomCode}`);
                }
            }

            // Process activations and remove completed events
            const classroomsToActivate = await Classroom.find({
                isActive: false,
                'scheduledEvents.activationTime': { $lte: now }
            });

            for (const classroom of classroomsToActivate) {
                const event = classroom.scheduledEvents.find(e => new Date(e.activationTime) <= now);
                if (event) {
                    classroom.isActive = true;
                    classroom.notes = `Đã tự động mở lại vào ${now.toLocaleString('vi-VN')}`;
                    // Remove the completed event
                    classroom.scheduledEvents = classroom.scheduledEvents.filter(e => e._id.toString() !== event._id.toString());
                    await classroom.save();
                    console.log(`Activated and removed event for classroom: ${classroom.roomCode}`);
                }
            }
        } catch (error) {
            console.error('Error running classroom scheduler:', error);
        }
    });
    console.log('Classroom scheduler started.');
};