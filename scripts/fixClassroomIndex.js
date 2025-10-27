const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const run = async () => {
    try {
        console.log('Connecting to MongoDB to fix classroom index...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/credit_registration');
        console.log('MongoDB connected successfully.');

        const classroomCollection = mongoose.connection.collection('classrooms');
        
        console.log('Checking for old indexes on "classrooms" collection...');
        const indexes = await classroomCollection.indexes();
        
        const oldIndexName = 'building_1_floor_1_roomNumber_1';
        const indexExists = indexes.some(index => index.name === oldIndexName);

        if (indexExists) {
            console.log(`Found old index "${oldIndexName}". Dropping it...`);
            await classroomCollection.dropIndex(oldIndexName);
            console.log(`Successfully dropped index "${oldIndexName}".`);
        } else {
            console.log(`Old index "${oldIndexName}" not found. No action needed.`);
        }

    } catch (error) {
        console.error('An error occurred:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    }
};

run();