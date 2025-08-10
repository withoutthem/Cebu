export default {
    rootDir: '.',
    testEnvironment: 'node',
    roots: ['<rootDir>/src/__tests__'],
    testMatch: ['**/*.test.ts', '**/*.test.tsx'],
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true, tsconfig: '<rootDir>/tsconfig.jest.json' }]
    },
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/../../shared/src/$1'
    }
};