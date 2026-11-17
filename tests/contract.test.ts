import { describe, expect, it } from 'vitest';
import SwaggerParser from '@apidevtools/swagger-parser';
import { isProduct, isProductQuery } from '@atelier/contracts';
describe('public contracts', () => {
  it('validates the full OpenAPI document with a standards-aware parser', async () => {
    const document = await SwaggerParser.validate('packages/contracts/openapi.json');
    expect(document.openapi).toBe('3.1.0');
  });
  it('rejects fractional money and unexpected request fields', () => {
    expect(isProductQuery({ id: 'watch-001', providerUrl: 'http://example.com' })).toBe(false);
    expect(isProduct({ id: 'watch-001', name: 'Watch', collection: 'Horizon', stock: 1, price: { amountMinor: 1.5, currency: 'EUR' } })).toBe(false);
  });
  it('validates the public Express REST contract', async () => {
    const document = await SwaggerParser.validate('packages/contracts/bff-openapi.json');
    expect(document.openapi).toBe('3.1.0');
  });
});
