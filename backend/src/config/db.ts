import mongoose from 'mongoose';
import { env } from './env.js';

import dns from "node:dns";
dns.setServers(["1.1.1.1", "1.0.0.1"]);

export async function connectDB() {
  await mongoose.connect(env.DATABASE_URL);
  console.log('MongoDB connected');
}

export async function disconnectDB() {
  await mongoose.disconnect();
}