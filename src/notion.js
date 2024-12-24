const { Client } = require('@notionhq/client');
require('dotenv').config();

// Initialize Notion Client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

// Function to fetch upcoming events from Notion
async function getNotionData() {
  const databaseId = process.env.NOTION_DATABASE_ID;
  const startTime = Date.now(); // Start timer

  const response = await notion.databases.query({
    database_id: databaseId,
  });

  const endTime = Date.now(); // End timer
  console.log(`Fetched upcoming events in ${endTime - startTime}ms`);

  const upcomingEvents = response.results.map(page => {
    const title = page.properties?.Tasks?.title?.[0]?.text?.content || 'No Title';
    const eventDate = page.properties?.Due?.date?.start || 'No Due Date';
    return `${title} - ${eventDate}`;
  }).reverse();

  return upcomingEvents;
}

// Function to fetch docs from a different Notion database
async function getNotionDocs() {
  const docsDatabaseId = process.env.NOTION_DOCS_DATABASE_ID;
  const startTime = Date.now(); // Start timer

  try {
    const response = await notion.databases.query({
      database_id: docsDatabaseId,
    });

    const endTime = Date.now(); // End timer
    console.log(`Fetched documents in ${endTime - startTime}ms`);

    const docsList = response.results.map(page => {
      const title = page.properties?.Title?.title?.[0]?.text?.content || 'Untitled';
      const url = page.url || '#';
      return { title, url };
    });

    return docsList;
  } catch (error) {
    console.error('Error fetching Notion docs:', error);
    throw error;
  }
}

module.exports = { getNotionData, getNotionDocs };
