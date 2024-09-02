const mongoose = require('mongoose');
const Job = require('./models/Job'); // Adjust this path if your Job model is located elsewhere
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI);

const addTestData = async () => {
    const testJobs = [
        {
            title: "Frontend Developer",
            department: "Engineering",
            location: "Remote",
            isOpen: true
        },
        {
            title: "Backend Developer",
            department: "Engineering",
            location: "New York",
            isOpen: true
        },
        {
            title: "UX Designer",
            department: "Design",
            location: "San Francisco",
            isOpen: true
        },
        {
            title: "Product Manager",
            department: "Product",
            location: "London",
            isOpen: false // This job won't appear in the dashboard as it's not open
        }
    ];

    try {
        for (const job of testJobs) {
            const newJob = new Job(job);
            await newJob.save();
        }
        console.log("Test data added successfully");
    } catch (error) {
        console.error("Error adding test data:", error);
    } finally {
        mongoose.connection.close();
    }
};

addTestData();