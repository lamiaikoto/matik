import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bookingRouter from './routes/booking';

// Chargement des variables d'environnement depuis .env
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// ─── Middleware ──────────────────────────────────────────
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// ─── Routes API ─────────────────────────────────────────
app.use('/api', bookingRouter);

// ─── Démarrage du serveur ───────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('┌──────────────────────────────────────────────┐');
  console.log('│  🔧 Matik Booking API Server                 │');
  console.log(`│  ✦ Port : ${PORT}                              │`);
  console.log(`│  ✦ URL  : http://localhost:${PORT}/api           │`);
  console.log('├──────────────────────────────────────────────┤');
  console.log(`│  📧 Resend  : ${process.env.RESEND_API_KEY ? '✅ Configuré' : '⚠️  Non configuré'}              │`);
  console.log(`│  💳 Stripe  : ${process.env.STRIPE_SECRET_KEY ? '✅ Configuré' : '⚠️  Non configuré'}              │`);
  console.log(`│  🗄️  Supabase: ${process.env.VITE_SUPABASE_URL ? '✅ Configuré' : '⚠️  Non configuré'}              │`);
  console.log('└──────────────────────────────────────────────┘');
  console.log('');
});

export default app;
