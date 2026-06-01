import { defineConfig } from 'orval';

export default defineConfig({
    indexer: {
        output: {
            mode: 'single',
            target: 'src/api/indexer/indexer.ts',
            schemas: 'src/api/indexer/model',
            client: 'vue-query',
        },
        input: {
            target: 'https://indexer.server4.devnet.carmentis.io/swagger-json',
        },
    },
});