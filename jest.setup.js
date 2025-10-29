// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Mock TradingView global objects
global.TradingView = {
  widget: jest.fn()
};

// Mock window object for browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock TransformStream for Node.js environment
global.TransformStream = jest.fn().mockImplementation(() => ({
  readable: {},
  writable: {},
}));

// Mock ReadableStream
global.ReadableStream = jest.fn().mockImplementation(() => ({
  getReader: jest.fn(),
}));

// Mock WritableStream
global.WritableStream = jest.fn().mockImplementation(() => ({
  getWriter: jest.fn(),
}));