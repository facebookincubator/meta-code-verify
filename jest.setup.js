import { jest } from '@jest/globals';

window.chrome = {
    runtime: {
        sendMessage: jest.fn(),
    }
};
