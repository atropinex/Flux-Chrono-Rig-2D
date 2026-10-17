import {useEffect, useState} from 'react'

interface Props {
    value: string
    onCommit: (v: string) => void
    className?: string
    placeholder?: string
}

/** Edits locally, commits on Enter or blur, Escape reverts. */
export function TextField({value, onCommit, className, placeholder}: Props) {
    const [text, setText] = useState(value)
    useEffect(() => setText(value), [value])
    return (
        <input
            className={className}
            type="text"
            value={text}
            placeholder={placeholder}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => onCommit(text)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') {
                    setText(value)
                    ;(e.target as HTMLInputElement).blur()
                }
            }}
        />
    )
}
