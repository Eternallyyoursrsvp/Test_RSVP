// Test script to verify transport save functionality
import http from 'http';

const postData = JSON.stringify({
  transportMode: 'selected',
  transportProviderName: 'Test Provider',
  transportProviderPhone: '9810070653',
  transportProviderEmail: 'test@example.com',
  transportInstructions: 'Test instructions',
  sendTravelUpdates: true,
  notifyGuests: true,
  providesAirportPickup: true,
  providesVenueTransfers: true,
  flightMode: 'none'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/wizard/transport',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Cookie': 'connect.sid=s%3AmAR3gYjvnfoKVsz44FYFmrzUe5bRrd7D.%2FJPqLX3RrjBnKEF%2FXrUYP%2FdKDbwBST9g8%2BA6lCOKiA0'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();