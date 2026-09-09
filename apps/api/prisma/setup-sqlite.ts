import { PrismaClient } from '@prisma/client'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { configureSqliteDatabaseUrl } from '../src/modules/prisma/sqlite-url'

configureSqliteDatabaseUrl()

const prisma = new PrismaClient()

async function main() {
	const [{ count }] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
		"SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'User'"
	)

	if (Number(count) > 0) {
		const [{ disposalReasonCount }] = await prisma.$queryRawUnsafe<
			Array<{ disposalReasonCount: bigint }>
		>(
			"SELECT COUNT(*) AS disposalReasonCount FROM sqlite_master WHERE type = 'table' AND name = 'DisposalReason'"
		)
		if (Number(disposalReasonCount) === 0) {
			await runMigration(
				join(
					__dirname,
					'migrations',
					'20260723000000_disposal_reasons',
					'migration.sql'
				)
			)
		}
		const [{ custodyCount }] = await prisma.$queryRawUnsafe<
			Array<{ custodyCount: bigint }>
		>(
			"SELECT COUNT(*) AS custodyCount FROM sqlite_master WHERE type = 'table' AND name = 'FixedAssetCustody'"
		)
		if (Number(custodyCount) === 0) {
			await runMigration(
				join(
					__dirname,
					'migrations',
					'20260726000000_fixed_asset_custody',
					'migration.sql'
				)
			)
		}
		const [{ gs1Count }] = await prisma.$queryRawUnsafe<
			Array<{ gs1Count: bigint }>
		>(
			"SELECT COUNT(*) AS gs1Count FROM pragma_table_info('Item') WHERE name = 'gtin'"
		)
		if (Number(gs1Count) === 0) {
			await runMigration(
				join(
					__dirname,
					'migrations',
					'20260726010000_gs1_identifiers',
					'migration.sql'
				)
			)
		} else {
			await ensureColumn('StorageLocation', 'gln', 'TEXT')
			await ensureUniqueIndex(
				'StorageLocation_gln_key',
				'StorageLocation',
				'gln'
			)
			await ensureColumn('BarcodeQRCode', 'gs1ElementString', 'TEXT')
		}
		const [{ categoryTypeCount }] = await prisma.$queryRawUnsafe<
			Array<{ categoryTypeCount: bigint }>
		>(
			"SELECT COUNT(*) AS categoryTypeCount FROM pragma_table_info('Item') WHERE name = 'subCategory'"
		)
		if (Number(categoryTypeCount) === 0) {
			await runMigration(
				join(
					__dirname,
					'migrations',
					'20260901000000_item_category_type_fields',
					'migration.sql'
				)
			)
		}
		const [{ returnCount }] = await prisma.$queryRawUnsafe<
			Array<{ returnCount: bigint }>
		>(
			"SELECT COUNT(*) AS returnCount FROM sqlite_master WHERE type = 'table' AND name = 'ItemReturn'"
		)
		if (Number(returnCount) === 0) {
			await runMigration(
				join(
					__dirname,
					'migrations',
					'20260902000000_item_returns',
					'migration.sql'
				)
			)
		}
		await ensureColumn('IssueRequest', 'recipientName', 'TEXT')
		if (
			Number(disposalReasonCount) > 0 &&
			Number(custodyCount) > 0 &&
			Number(gs1Count) > 0 &&
			Number(categoryTypeCount) > 0 &&
			Number(returnCount) > 0
		) {
			console.log('SQLite schema already exists.')
			return
		}
		console.log('SQLite schema updated.')
		return
	}

	const migrationRoot = join(__dirname, 'migrations')
	const migrationPaths = readdirSync(migrationRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => join(migrationRoot, entry.name, 'migration.sql'))
		.sort()

	for (const migrationPath of migrationPaths) {
		await runMigration(migrationPath)
	}

	console.log('SQLite schema created.')
}

async function ensureColumn(table: string, column: string, definition: string) {
	const [{ count }] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
		`SELECT COUNT(*) AS count FROM pragma_table_info('${table}') WHERE name = '${column}'`
	)
	if (Number(count) === 0) {
		await prisma.$executeRawUnsafe(
			`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`
		)
	}
}

async function ensureUniqueIndex(
	indexName: string,
	table: string,
	column: string
) {
	const [{ count }] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
		`SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'index' AND name = '${indexName}'`
	)
	if (Number(count) === 0) {
		await prisma.$executeRawUnsafe(
			`CREATE UNIQUE INDEX "${indexName}" ON "${table}"("${column}")`
		)
	}
}

async function runMigration(migrationPath: string) {
	const migrationSql = readFileSync(migrationPath, 'utf8')
	const statements = migrationSql
		.split(/;\s*(?:\r?\n|$)/)
		.map((statement) => statement.trim())
		.filter(Boolean)

	await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF')
	try {
		for (const statement of statements) {
			await prisma.$executeRawUnsafe(statement)
		}
	} finally {
		await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON')
	}
}

main()
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
