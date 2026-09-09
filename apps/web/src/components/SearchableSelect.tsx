import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '../lib/utils'

export type SearchableSelectOption = {
	value: string
	label: string
	disabled?: boolean
}

type SearchableSelectProps = {
	value: string
	onChange: (value: string) => void
	options: SearchableSelectOption[]
	placeholder?: string
	className?: string
	disabled?: boolean
	emptyMessage?: string
	name?: string
	'aria-label'?: string
}

/**
 * A searchable dropdown/combobox that visually matches the app's native
 * `<select className="rounded border border-border bg-background px-3 py-2 text-sm">`
 * styling while allowing the user to type and filter options before selecting.
 * Behaves like a controlled select: `value`/`onChange` carry the same option
 * value that would otherwise be submitted by a native select element.
 */
export function SearchableSelect({
	value,
	onChange,
	options,
	placeholder = 'Select...',
	className,
	disabled,
	emptyMessage = 'No matches found.',
	name,
	...rest
}: SearchableSelectProps) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [activeIndex, setActiveIndex] = useState(0)
	const containerRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	const selected = options.find((option) => option.value === value)

	const filtered = useMemo(() => {
		const term = query.trim().toLowerCase()
		if (!term) return options
		return options.filter((option) => option.label.toLowerCase().includes(term))
	}, [options, query])

	useEffect(() => {
		if (!open) return
		function handleClick(event: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setOpen(false)
				setQuery('')
			}
		}
		document.addEventListener('mousedown', handleClick)
		return () => document.removeEventListener('mousedown', handleClick)
	}, [open])

	useEffect(() => {
		if (open) {
			setActiveIndex(0)
			const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
			return () => window.clearTimeout(timer)
		}
		setQuery('')
	}, [open])

	function commit(optionValue: string) {
		onChange(optionValue)
		setOpen(false)
		setQuery('')
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'ArrowDown') {
			event.preventDefault()
			setActiveIndex((index) =>
				Math.min(index + 1, Math.max(filtered.length - 1, 0))
			)
		} else if (event.key === 'ArrowUp') {
			event.preventDefault()
			setActiveIndex((index) => Math.max(index - 1, 0))
		} else if (event.key === 'Enter') {
			event.preventDefault()
			const option = filtered[activeIndex]
			if (option && !option.disabled) commit(option.value)
		} else if (event.key === 'Escape') {
			event.preventDefault()
			setOpen(false)
			setQuery('')
		}
	}

	return (
		<div className='relative min-w-0' ref={containerRef}>
			<button
				type='button'
				name={name}
				disabled={disabled}
				className={cn(
					'flex w-full min-w-0 items-center justify-between gap-2 rounded border border-border bg-background px-3 py-2 text-left text-sm disabled:opacity-60',
					className
				)}
				onClick={() => setOpen((current) => !current)}
				aria-haspopup='listbox'
				aria-expanded={open}
				{...rest}
			>
				<span className={cn('truncate', !selected && 'text-muted-foreground')}>
					{selected ? selected.label : placeholder}
				</span>
				<ChevronDown size={14} className='shrink-0 text-muted-foreground' />
			</button>
			{open && (
				<div className='absolute left-0 top-full z-40 mt-1 w-full min-w-[12rem] overflow-hidden rounded-lg border border-border bg-[hsl(var(--surface))] shadow-2xl'>
					<label className='relative block border-b border-border p-2'>
						<Search
							className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary'
							size={14}
						/>
						<input
							ref={inputRef}
							className='w-full rounded border border-border bg-background py-1.5 pl-8 pr-2 text-sm'
							placeholder='Search...'
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							onKeyDown={handleKeyDown}
						/>
					</label>
					<ul role='listbox' className='max-h-56 overflow-y-auto py-1 text-sm'>
						{filtered.length === 0 && (
							<li className='px-3 py-2 text-xs text-muted-foreground'>
								{emptyMessage}
							</li>
						)}
						{filtered.map((option, index) => (
							<li key={option.value}>
								<button
									type='button'
									role='option'
									aria-selected={option.value === value}
									disabled={option.disabled}
									className={cn(
										'flex w-full items-center justify-between gap-2 px-3 py-2 text-left disabled:opacity-50',
										index === activeIndex
											? 'bg-primary/10'
											: 'hover:bg-[hsl(var(--surface-subtle))]'
									)}
									onMouseEnter={() => setActiveIndex(index)}
									onClick={() => commit(option.value)}
								>
									<span className='truncate'>{option.label}</span>
									{option.value === value && (
										<Check size={14} className='shrink-0 text-primary' />
									)}
								</button>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	)
}
