import { getCart } from './src/controllers/cartController.js';

async function testController() {
  try {
    // Mock request object
    const mockReq = {
      user: { student_id: 'TEST001' }
    };

    // Mock response object
    const mockRes = {
      status: (code: number) => ({
        json: (data: any) => {
          console.log('Response:', code, data);
          return data;
        }
      }),
      json: (data: any) => {
        console.log('Response:', data);
        return data;
      }
    };

    await getCart(mockReq as any, mockRes as any);
  } catch (error) {
    console.error('Error:', error);
  }
}

testController();
