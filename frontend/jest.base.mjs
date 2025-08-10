export default {
    rootDir: '.',
    testEnvironment: 'node',
    testMatch: ['**/*.test.(ts|tsx)'],
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true, tsconfig: '<rootDir>/tsconfig.jest.json' }]
    },
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/../../shared/src/$1'
    }
};