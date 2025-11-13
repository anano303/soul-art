const mongoose = require('mongoose');
const geoip = require('geoip-lite');

const countryMap = {
  GE: 'Georgia',
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  RU: 'Russia',
  TR: 'Turkey',
  UA: 'Ukraine',
  BG: 'Bulgaria',
  PL: 'Poland',
  RO: 'Romania',
  NL: 'Netherlands',
};

async function updateLocations() {
  try {
    await mongoose.connect('mongodb://localhost:27017/soulart');
    console.log('Connected to MongoDB');

    const Visitor = mongoose.model(
      'Visitor',
      new mongoose.Schema({}, { strict: false, collection: 'visitors' })
    );

    // Find all visitors with Unknown location
    const visitors = await Visitor.find({
      $or: [{ country: 'Unknown' }, { city: 'Unknown' }],
    });

    console.log(`Found ${visitors.length} visitors with Unknown location`);

    for (const v of visitors) {
      let country = v.country;
      let city = v.city;

      if (v.ip && v.ip !== 'Unknown') {
        // Handle localhost/private IPs
        if (
          v.ip === '127.0.0.1' ||
          v.ip === '::1' ||
          v.ip.startsWith('192.168.') ||
          v.ip.startsWith('10.') ||
          v.ip.startsWith('172.16.') ||
          v.ip.startsWith('172.17.') ||
          v.ip.startsWith('172.18.') ||
          v.ip.startsWith('172.19.') ||
          v.ip.startsWith('172.20.') ||
          v.ip.startsWith('172.21.') ||
          v.ip.startsWith('172.22.') ||
          v.ip.startsWith('172.23.') ||
          v.ip.startsWith('172.24.') ||
          v.ip.startsWith('172.25.') ||
          v.ip.startsWith('172.26.') ||
          v.ip.startsWith('172.27.') ||
          v.ip.startsWith('172.28.') ||
          v.ip.startsWith('172.29.') ||
          v.ip.startsWith('172.30.') ||
          v.ip.startsWith('172.31.')
        ) {
          country = 'Georgia';
          city = 'Tbilisi';
        } else {
          // Lookup real IP
          const geo = geoip.lookup(v.ip);
          if (geo) {
            country = countryMap[geo.country] || geo.country;
            city = geo.city || 'Unknown';
          }
        }

        console.log(
          `Updating ${v._id}: ${v.ip} -> ${country}, ${city}`
        );

        await Visitor.updateOne(
          { _id: v._id },
          { $set: { country, city } }
        );
      }
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateLocations();
