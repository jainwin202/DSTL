import fetch from 'node-fetch';

const docIds = ['cd97d440-509e-446d-84e3-86ae4d7085f8', '296ce8e1-1e02-48c3-9062-eb8fc0a935a8'];

let completed = 0;

for (const docId of docIds) {
  fetch(`http://localhost:3001/api/verify/${docId}`)
    .then(res => {
      const status = res.status;
      return res.text().then(data => ({ status, data }));
    })
    .then(({ status, data }) => {
      console.log(`\n✅ DocId: ${docId}`);
      console.log(`Status: ${status}`);
      try {
        const json = JSON.parse(data);
        if (status === 200) {
          console.log('✓ Document found on blockchain!');
          console.log('Owner:', json.entry?.owner);
          console.log('Issuer:', json.entry?.issuer);
        } else {
          console.log('Error:', json.error);
        }
      } catch(e) {
        console.log('Raw:', data);
      }
      completed++;
      if (completed === docIds.length) process.exit(0);
    })
    .catch(e => {
      console.error(`❌ Error for ${docId}:`, e.message);
      completed++;
      if (completed === docIds.length) process.exit(1);
    });
}

setTimeout(() => { console.log('Timeout'); process.exit(1); }, 3000);
