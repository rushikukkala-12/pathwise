/**
 * Seeds PathWise with demo data.   Usage: npm run seed
 * WARNING: clears users, trips, expenses, itineraries and places.
 */
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Expense = require('../models/Expense');
const Place = require('../models/Place');
const Itinerary = require('../models/Itinerary');
const placesData = require('./places');
const { generateItinerary, modifyItinerary } = require('../services/itineraryService');
const { recalcTrip } = require('../services/budgetService');
const { getForecastMap, isOutdoorUnsuitable } = require('../services/weatherService');
const { startOfDay, addDays, inclusiveDays } = require('../utils/dates');

if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  console.error('Refusing to seed in production: this script DELETES all data. Re-run with --force if you really mean it.');
  process.exit(1);
}

const today = startOfDay(new Date());
const d = (n) => addDays(today, n);

async function makeTrip(user, t, expenses = [], createdDaysAgo = 10) {
  const start = d(t.start);
  const end = d(t.start + t.days - 1);
  const trip = new Trip({
    userId: user._id, title: t.title, startingLocation: t.from, destination: t.to, startDate: start, endDate: end,
    numberOfDays: inclusiveDays(start, end), numberOfTravelers: t.travelers, totalBudget: t.budget, interests: t.interests, remainingBudget: t.budget,
  });
  await trip.save();
  await generateItinerary(trip);
  if (expenses.length) {
    await Expense.insertMany(expenses.map(([offset, category, description, amount]) => ({
      userId: user._id, tripId: trip._id, category, description, amount, date: d(t.start + offset), createdAt: d(t.start + offset),
    })));
    await recalcTrip(trip._id);
  }
  const created = addDays(today, -createdDaysAgo);
  await Trip.updateOne({ _id: trip._id }, { $set: { createdAt: created, updatedAt: created } });
  return trip;
}

(async () => {
  await connectDB();
  await Promise.all([User.deleteMany({}), Trip.deleteMany({}), Expense.deleteMany({}), Place.deleteMany({}), Itinerary.deleteMany({})]);

  await Place.insertMany(placesData);
  console.log(`Places: ${placesData.length}`);

  const mk = async (name, email, password, role, monthsAgo) => {
    const u = new User({ name, email, password, role });
    u.createdAt = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsAgo, 8 + (monthsAgo * 3) % 15));
    await u.save();
    return u;
  };
  const admin = await mk('PathWise Admin', 'admin@pathwise.com', 'Admin@123', 'admin', 6);
  const demo = await mk('Aarav Kumar', 'user@pathwise.com', 'User@123', 'user', 3);
  const priya = await mk('Priya Sharma', 'priya@pathwise.com', 'User@123', 'user', 5);
  const rahul = await mk('Rahul Verma', 'rahul@pathwise.com', 'User@123', 'user', 4);
  const ananya = await mk('Ananya Reddy', 'ananya@pathwise.com', 'User@123', 'user', 2);
  const karthik = await mk('Karthik Nair', 'karthik@pathwise.com', 'User@123', 'user', 1);
  const sneha = await mk('Sneha Patel', 'sneha@pathwise.com', 'User@123', 'user', 0);
  console.log('Users: 7 (1 admin)');

  // ---- Demo user: a trip in each state --------------------------------------------------------
  // ACTIVE – 85% spent -> triggers the "budget almost exhausted" alert and cheaper alternatives
  const goa = await makeTrip(demo, { title: 'Goa Beach Escape', from: 'Hyderabad', to: 'Goa', start: -2, days: 5, travelers: 2, budget: 45000, interests: ['Beaches', 'Food', 'Photography', 'Relaxation'] }, [
    [0, 'Transportation', 'Flight Hyderabad → Goa (2 pax)', 8200],
    [0, 'Accommodation', 'Beach resort - 4 nights advance', 15000],
    [0, 'Food', 'Airport lunch & dinner', 1350],
    [1, 'Food', 'Breakfast and seafood lunch at Baga', 2100],
    [1, 'Activities', 'Water sports at Calangute', 3000],
    [1, 'Transportation', 'Scooter rental + fuel', 1200],
    [1, 'Shopping', 'Anjuna flea market souvenirs', 3000],
    [2, 'Activities', 'Fort Aguada + Basilica entry & guide', 900],
    [2, 'Food', 'Goan seafood shack dinner', 2650],
    [2, 'Transportation', 'Taxi to Old Goa', 1100],
    [2, 'Other', 'Sunscreen, chargers, toiletries', 500],
  ], 14);
  // Simulate "the forecast worsened after the plan was made": find the first upcoming wet day and put an outdoor stop on it.
  {
    const days = await Itinerary.find({ tripId: goa._id }).sort({ day: 1 });
    const fc = await getForecastMap('Goa', days.map((x) => x.date));
    const wet = days.find((x) => new Date(x.date) >= today && isOutdoorUnsuitable(fc[x.date.toISOString().slice(0, 10)]));
    const outdoor = await Place.findOne({ destination: 'Goa', name: 'Baga Beach' });
    if (wet) await modifyItinerary(goa, { action: 'replace', day: wet.day, itemId: String(wet.places[0]._id), placeId: String(outdoor._id) });
  }

  // UPCOMING with small advance payment
  await makeTrip(demo, { title: 'Heritage Hyderabad Weekend', from: 'Eluru', to: 'Hyderabad', start: 12, days: 3, travelers: 3, budget: 24000, interests: ['Historical', 'Food', 'Culture'] }, [
    [-9, 'Accommodation', 'Hotel booking advance', 4000],
    [-9, 'Transportation', 'Train tickets (3 pax)', 1260],
  ], 7);

  // COMPLETED – over budget
  await makeTrip(demo, { title: 'Araku Valley Escape', from: 'Vizag', to: 'Araku', start: -40, days: 3, travelers: 2, budget: 15000, interests: ['Nature', 'Adventure', 'Photography'] }, [
    [0, 'Accommodation', 'Resort stay (2 nights)', 6400],
    [0, 'Transportation', 'Cab Vizag ↔ Araku', 4200],
    [1, 'Food', 'Meals and bamboo chicken', 2100],
    [1, 'Activities', 'Borra Caves, Katiki Falls, Tyda', 1650],
    [2, 'Shopping', 'Araku coffee & honey', 1300],
    [2, 'Other', 'Tips, parking & misc', 550],
  ], 50);

  // PLANNED – big group
  await makeTrip(demo, { title: 'Royal Rajasthan - Jaipur', from: 'Hyderabad', to: 'Jaipur', start: 30, days: 4, travelers: 4, budget: 60000, interests: ['Historical', 'Shopping', 'Photography', 'Food'] }, [], 3);
  await makeTrip(demo, { title: 'Kerala Backwaters Retreat', from: 'Chennai', to: 'Kerala', start: 60, days: 5, travelers: 2, budget: 70000, interests: ['Nature', 'Relaxation', 'Food', 'Photography'] }, [], 1);

  // ---- Other users ---------------------------------------------------------------------------
  await makeTrip(priya, { title: 'Delhi Heritage Walk', from: 'Jaipur', to: 'Delhi', start: -20, days: 3, travelers: 2, budget: 20000, interests: ['Historical', 'Food', 'Culture'] }, [
    [0, 'Accommodation', 'Hotel in Paharganj', 4800], [0, 'Food', 'Chandni Chowk food crawl', 1500], [1, 'Activities', 'Monument tickets', 760], [2, 'Transportation', 'Metro & cabs', 1300],
  ], 40);
  await makeTrip(priya, { title: 'Bengaluru Weekend', from: 'Chennai', to: 'Bengaluru', start: 8, days: 2, travelers: 2, budget: 14000, interests: ['Food', 'Nature', 'Entertainment'] }, [], 20);
  await makeTrip(rahul, { title: 'Tirupati Darshan', from: 'Vijayawada', to: 'Tirupati', start: -60, days: 2, travelers: 4, budget: 18000, interests: ['Culture', 'Nature'] }, [
    [0, 'Transportation', 'Train tickets', 3200], [0, 'Accommodation', 'TTD guest house', 2000], [1, 'Food', 'Meals', 2400], [1, 'Activities', 'Special entry darshan', 4800],
  ], 75);
  await makeTrip(ananya, { title: 'Vizag Beach Break', from: 'Hyderabad', to: 'Vizag', start: 5, days: 4, travelers: 3, budget: 36000, interests: ['Beaches', 'Food', 'Nature'] }, [[-4, 'Transportation', 'Bus tickets', 2700]], 12);
  await makeTrip(karthik, { title: 'Chennai & Mahabalipuram', from: 'Bengaluru', to: 'Chennai', start: -5, days: 3, travelers: 2, budget: 22000, interests: ['Historical', 'Culture', 'Beaches'] }, [
    [0, 'Accommodation', 'Hotel T. Nagar', 5400], [0, 'Food', 'Meals', 1800], [1, 'Activities', 'Shore Temple & museum', 330],
  ], 9);
  await makeTrip(sneha, { title: 'Vijayawada Temple Run', from: 'Hyderabad', to: 'Vijayawada', start: 18, days: 2, travelers: 2, budget: 9000, interests: ['Culture', 'Food'] }, [], 2);

  await makeTrip(rahul, { title: 'Goa with Friends', from: 'Hyderabad', to: 'Goa', start: -75, days: 4, travelers: 5, budget: 70000, interests: ['Beaches', 'Entertainment', 'Food'] }, [
    [0, 'Accommodation', 'Beach villa', 22000], [0, 'Transportation', 'Flights (5 pax)', 24000], [1, 'Food', 'Group dinners', 9800], [2, 'Activities', 'Water sports', 11000], [3, 'Shopping', 'Souvenirs', 4200],
  ], 90);
  await makeTrip(ananya, { title: 'Hyderabad Food Trail', from: 'Vijayawada', to: 'Hyderabad', start: -30, days: 2, travelers: 2, budget: 12000, interests: ['Food', 'Culture'] }, [
    [0, 'Transportation', 'Bus tickets', 1400], [0, 'Food', 'Biryani and Irani chai', 2600], [1, 'Activities', 'Salar Jung Museum + Charminar', 350], [1, 'Accommodation', 'Budget hotel', 2800],
  ], 45);
  await makeTrip(priya, { title: 'Kerala Honeymoon', from: 'Bengaluru', to: 'Kerala', start: -50, days: 5, travelers: 2, budget: 85000, interests: ['Nature', 'Relaxation', 'Photography'] }, [
    [0, 'Accommodation', 'Houseboat + resort', 38000], [1, 'Activities', 'Backwater cruise, Munnar tour', 9500], [2, 'Food', 'Meals', 7400], [3, 'Transportation', 'Cab for 5 days', 12000], [4, 'Shopping', 'Spices and tea', 3100],
  ], 70);
  await makeTrip(karthik, { title: 'Jaipur Palaces', from: 'Chennai', to: 'Jaipur', start: 45, days: 4, travelers: 2, budget: 52000, interests: ['Historical', 'Photography', 'Shopping'] }, [], 4);
  await makeTrip(sneha, { title: 'Delhi Weekend', from: 'Jaipur', to: 'Delhi', start: -12, days: 3, travelers: 3, budget: 30000, interests: ['Historical', 'Food', 'Shopping'] }, [
    [0, 'Accommodation', 'Hotel', 7200], [1, 'Food', 'Chandni Chowk food walk', 2400], [2, 'Shopping', 'Dilli Haat', 3600],
  ], 20);

  const counts = await Promise.all([User.countDocuments(), Trip.countDocuments(), Expense.countDocuments(), Itinerary.countDocuments()]);
  console.log(`Seed complete → users ${counts[0]}, trips ${counts[1]}, expenses ${counts[2]}, itinerary days ${counts[3]}`);
  console.log('\nDemo credentials:\n  Admin : admin@pathwise.com / Admin@123\n  User  : user@pathwise.com  / User@123');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
