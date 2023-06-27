import * as fs from 'fs';
import * as csvWriter from 'csv-writer';
import { getWeb3Interface } from "../utils/web3-interface";
import { tier_1_embalmers } from "../data/tier_1";

const contracts: string[] = [
  "0x96e6192eeaf7bb308f79fb5017a9085754b9e12a",
  "0x6B84f17bbfCe26776fEFDf5cF039cA0E66C46Caf",
  "0x550abAc09404c14415bce6D13A9b9A3C8751aF8c",
  "0x25844741A8223Dc7c5B846E198D479c6993009F7",
  "0x270Ffc6B0e0d8b8F66C30965AF25cB872B2Ee273",
  "0x814De2Db5D12E7e10B79D128Fca70Baba53d8394"
];

const writeCSV = async (diamondAddresses: string[]) => {
  // Prepare CSV writer
  const csv = csvWriter.createObjectCsvWriter({
    path: 'tier2.csv',
    header: [
      {id: 'address', title: 'Address'},
      {id: 'count', title: 'Count'}
    ],
    append: true
  });

  // Iterate over diamondAddresses and make async calls
  let embalmerRecords: Record<string, number> = {}

  for (const address of diamondAddresses) {
    const { viewStateFacet } = await getWeb3Interface(address)

    for (const embalmer of tier_1_embalmers) {
      if (!!embalmerRecords[embalmer]) {
        continue
      }

      try {
        const embalmerSarcophagi = await viewStateFacet.getEmbalmerSarcophagi(embalmer)
        embalmerRecords[embalmer] = (embalmerRecords[embalmer] || 0) + embalmerSarcophagi.length
      } catch (error) {
        console.log(`error with embalmer ${embalmer}`, error)
        embalmerRecords[embalmer] = (embalmerRecords[embalmer] || 0)
      }
    }
  }

  const csvRecords: any = []
  for (const embalmerRecord of Object.keys(embalmerRecords)) {
    csvRecords.push({
      address: embalmerRecord,
      count: embalmerRecords[embalmerRecord]
    })
  }

  console.log(csvRecords)

  // Write to CSV file
  csv.writeRecords(csvRecords).then(() => {
    console.log('CSV file written successfully');
  });
};

writeCSV(contracts);