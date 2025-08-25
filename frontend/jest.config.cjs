// jest.config.cjs
const { pathsToModuleNameMapper } = require('ts-jest')
const tsconfig = require('./tsconfig.json')

/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: '<rootDir>/tsconfig.json',   // 경로 명시
                diagnostics: { ignoreCodes: ['TS151001'] } // 경고 무시
            },
        ],
    },
    moduleNameMapper: tsconfig.compilerOptions?.paths
        ? pathsToModuleNameMapper(tsconfig.compilerOptions.paths, { prefix: '<rootDir>/' })
        : {},
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js)'],
}