import * as fs from 'fs';

console.log("testing")
// Read the content of the JSON file
fs.readFile('src/data/data.json', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  try {
    // Parse the JSON data
    const jsonData = JSON.parse(data);

    // Access and use the parsed data
    let formattedArchs = Object.entries(jsonData).map(([key, value]) => {
      return {
        id: key,
        data: value
      }
    });

    // Convert JSON data to a string

    // @ts-ignore
    const archsSorted = JSON.stringify(
      formattedArchs
        // @ts-ignore
        .sort((a, b) => b.data.successes - a.data.successes)
        .map(arch => {
          return {
            address: arch.id,
            // @ts-ignore
            successes: arch.data.successes,
            // @ts-ignore
            dialAttempts: arch.data.dialAttempts,
            // @ts-ignore
            uptimeRatio: arch.data.uptimeRatio
          }
        })
    );

// Write the JSON string to a file
    fs.writeFile('src/data/output.json', archsSorted, 'utf8', (err) => {
      if (err) {
        console.error('Error writing file:', err);
        return;
      }

      console.log('File written successfully.');
    });

    // Do further processing or manipulation with the JSON data
    // ...
  } catch (err) {
    console.error('Error parsing JSON:', err);
  }
});


