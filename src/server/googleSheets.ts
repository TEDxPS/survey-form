export async function getSheetHeaders(sheetId: string, headerRange: string, apiKey: string) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${headerRange}?key=${apiKey}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data.values[0]; // First row contains headers
    } catch (error) {
      console.error('Error fetching headers:', error);
      throw error;
    }
  }
  
  export async function appendToGoogleSheet(sheetId: string, range: string, apiKey: string, values: any[][], accessToken?: string) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&key=${apiKey}`;
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
  
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
  
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          values: values
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Error appending to Google Sheet:', error);
      throw error;
    }
  }