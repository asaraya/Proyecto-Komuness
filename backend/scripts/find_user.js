const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || process.env.MONGODB_URI ||
  'mongodb+srv://admin:admin12345@proyectokomuness.v67qs.mongodb.net/ProyectoKomuness?retryWrites=true&w=majority&appName=proyectokomuness';

const schema = new mongoose.Schema({}, { strict: false, collection: 'usuarios' });
const User = mongoose.model('usuarios', schema);

(async () => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    const correo = process.argv[2] || 'administrador@gmail.com';
    const u = await User.findOne({ correo });
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
