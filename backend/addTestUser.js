const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

async function addTestUser() {
    try {
        const testUser = new User({
            username: 'Rauf2',
            email: 'testuser2@example.com',
            password: '123' // The password will be hashed by the pre-save middleware
        });

        await testUser.save();
        console.log('Test user added successfully');
    } catch (error) {
        console.error('Error adding test user:', error);
    } finally {
        mongoose.connection.close();
    }
}

addTestUser();