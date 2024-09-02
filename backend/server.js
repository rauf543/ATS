const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const Redis = require('ioredis');
const multer = require('multer');
const path = require('path');  // Add this line
const mime = require('mime-types');
const User = require('./models/User');
const Job = require('./models/Job');
const Application = require('./models/Application');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL, // Replace with your frontend URL
    optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);


// File upload configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });


// Connect to Redis
const redis = new Redis(process.env.REDIS_URL);

// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded._id });

        if (!user) {
            throw new Error();
        }

        req.token = token;
        req.user = user;
        next();
    } catch (error) {
        res.status(401).send({ error: 'Please authenticate.' });
    }
};

// Middleware to serve static files
app.use('/uploads', (req, res, next) => {
    const filePath = path.join(__dirname, 'uploads', req.url);
    const mimeType = mime.lookup(filePath);

    if (mimeType) {
        res.setHeader('Content-Type', mimeType);
    }

    // For PDF files, set Content-Disposition to inline
    if (mimeType === 'application/pdf') {
        res.setHeader('Content-Disposition', 'inline');
    }

    next();
}, express.static('uploads'));

// Sign-in endpoint
app.post('/api/auth/signin', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).send({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        await redis.set(user._id.toString(), token, 'EX', 3600); // Store token in Redis for 1 hour

        res.send({ token });
    } catch (error) {
        console.error('Sign-in error:', error);
        res.status(500).json({ error: 'An error occurred during sign in' });
    }
});

// Sign-out endpoint
app.post('/api/auth/signout', authenticate, async (req, res) => {
    try {
        await redis.del(req.user._id.toString());
        res.send({ message: 'Successfully signed out' });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Password reset request endpoint
app.post('/api/auth/reset-password-request', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        const resetToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // TODO: Send email with reset token
        res.send({ message: 'Password reset email sent' });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Password reset endpoint
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).send({ error: 'Invalid or expired token' });
        }

        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.send({ message: 'Password successfully reset' });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// User profile endpoint
app.get('/api/user/profile', authenticate, async (req, res) => {
    res.send(req.user);
});

// Job routes
app.get('/api/jobs', authenticate, async (req, res) => {
    try {
        const { search, page = 1, limit = 9 } = req.query;
        let matchQuery = { isOpen: true };

        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            matchQuery.title = { $regex: escapedSearch, $options: 'i' };
        }

        const aggregationPipeline = [
            { $match: matchQuery },
            {
                $lookup: {
                    from: 'applications',
                    localField: '_id',
                    foreignField: 'job',
                    as: 'applications'
                }
            },
            {
                $addFields: {
                    applicationsCount: { $size: '$applications' }
                }
            },
            {
                $project: {
                    applications: 0 // Remove the applications array from the result
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    metadata: [{ $count: "total" }, { $addFields: { page: parseInt(page) } }],
                    jobs: [{ $skip: (parseInt(page) - 1) * parseInt(limit) }, { $limit: parseInt(limit) }]
                }
            }
        ];

        const result = await Job.aggregate(aggregationPipeline);

        const jobs = result[0].jobs;
        const metadata = result[0].metadata[0];

        res.json({
            jobs,
            totalPages: metadata ? Math.ceil(metadata.total / parseInt(limit)) : 0,
            currentPage: parseInt(page)
        });
    } catch (err) {
        console.error('Error fetching jobs:', err);
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/jobs/:id', authenticate, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id).populate('applicationsCount');
        if (!job) return res.status(404).json({ message: 'Job not found' });
        res.json(job);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/jobs', authenticate, async (req, res) => {
    const job = new Job({
        title: req.body.title,
        department: req.body.department,
        location: req.body.location,
        isOpen: req.body.isOpen
    });
    try {
        const newJob = await job.save();
        res.status(201).json(newJob);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.put('/api/jobs/:id', authenticate, async (req, res) => {
    try {
        const updatedJob = await Job.findByIdAndUpdate(req.params.id,
            {
                title: req.body.title,
                department: req.body.department,
                location: req.body.location,
                isOpen: req.body.isOpen
            },
            { new: true }
        );
        res.json(updatedJob);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/jobs/:id', authenticate, async (req, res) => {
    try {
        const jobId = req.params.id;

        // Find all applications for this job
        const applications = await Application.find({ job: jobId });

        // Delete all file uploads associated with these applications
        for (const application of applications) {
            if (application.cvUrl) {
                const filePath = path.join(__dirname, application.cvUrl);
                try {
                    await fs.unlink(filePath);
                    console.log(`Deleted file: ${filePath}`);
                } catch (err) {
                    console.error(`Error deleting file: ${filePath}`, err);
                }
            }
        }

        // Delete all applications for this job
        await Application.deleteMany({ job: jobId });

        // Delete the job
        await Job.findByIdAndDelete(jobId);

        res.json({ message: 'Job and associated applications deleted successfully' });
    } catch (err) {
        console.error('Error deleting job:', err);
        res.status(500).json({ message: err.message });
    }
});

// New Application routes
app.get('/api/jobs/:jobId/applications', authenticate, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { search, stage } = req.query;
        let query = { job: jobId };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        if (stage) {
            query.stage = stage;
        }

        const applications = await Application.find(query);
        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/jobs/:jobId/applications', authenticate, upload.single('cv'), async (req, res) => {
    try {
        const { jobId } = req.params;
        const { name, email, phone, stage } = req.body;
        const cvUrl = req.file ? `/uploads/${req.file.filename}` : null;

        if (!cvUrl) {
            return res.status(400).json({ message: 'CV file is required' });
        }

        const application = new Application({
            name,
            email,
            phone,
            cvUrl,
            stage,
            job: jobId
        });

        const savedApplication = await application.save();
        res.status(201).json(savedApplication);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/jobs/:jobId/applications/:id', authenticate, async (req, res) => {
    try {
        const { jobId, id } = req.params;
        const application = await Application.findOne({ _id: id, job: jobId });
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }
        res.json(application);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.patch('/api/jobs/:jobId/applications/:id/stage', authenticate, async (req, res) => {
    try {
        const { jobId, id } = req.params;
        const { stage } = req.body;
        const application = await Application.findOneAndUpdate(
            { _id: id, job: jobId },
            { stage },
            { new: true }
        );
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }
        res.json(application);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/jobs/:jobId/applications/:id', authenticate, async (req, res) => {
    try {
        const { jobId, id } = req.params;
        const application = await Application.findOne({ _id: id, job: jobId });

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // Delete the CV file
        if (application.cvUrl) {
            const filePath = path.join(__dirname, application.cvUrl);
            try {
                await fs.unlink(filePath);
                console.log(`Deleted file: ${filePath}`);
            } catch (err) {
                console.error(`Error deleting file: ${filePath}`, err);
                // We don't throw here to ensure the database entry is still deleted
            }
        }

        // Delete the application from the database
        await Application.findOneAndDelete({ _id: id, job: jobId });

        res.json({ message: 'Application and associated CV deleted successfully' });
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({ message: error.message });
    }
});
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});