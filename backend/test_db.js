import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const testConnect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("SUCCESS: Connected to MongoDB");
        process.exit(0);
    } catch (err) {
        console.error("FAILURE:", err.message);
        process.exit(1);
    }
};

testConnect();
