import { describe, expect, it } from 'vitest'
import { exportService } from '../src/features/export/exportService'

describe('exportService', () => {
  it('generates a valid ZIP archive containing notes and manifest.json', async () => {
    const blob = await exportService.exportVaultToZip()

    expect(blob).toBeDefined()
    expect(blob.size).toBeGreaterThan(100)
    expect(blob.type).toBe('application/zip')
  })
})
