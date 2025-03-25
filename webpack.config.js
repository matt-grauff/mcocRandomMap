module.exports = {
    entry: './src/index.ts',
    output: {
        filename: 'bundle.js',
    },
    mode: 'development',
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/i,
                exclude: /node_modules/,
                use: ['babel-loader']
            },
            {
                test: /\.(ts|tsx)$/,
                loader: 'ts-loader',
            }
        ],
    },
    resolve: {
        extensions: ['.js', '.ts'],
    }
}