import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import './CustomDropdown.scss';

export default function CustomDropdown({
  label,
  icon: Icon,
  options,
  value,
  onChange,
  disabled = false,
  searchable = false,
  placeholder = "Select..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = searchable && searchTerm.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : options;

  return (
    <div className={`custom-dropdown-container ${isOpen ? 'is-open' : ''} ${disabled ? 'disabled' : ''}`} ref={dropdownRef}>
      {label && (
        <label className="dropdown-label">
          {Icon && <Icon size={13} className="label-icon" />}
          <span>{label}</span>
        </label>
      )}

      <button
        type="button"
        className={`dropdown-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="trigger-left">
          {selectedOption?.badge && (
            <span className="trigger-badge">{selectedOption.badge}</span>
          )}
          <span className="trigger-text">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown size={16} className={`chevron-icon ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="dropdown-menu glass-menu">
          {searchable && (
            <div className="dropdown-search-wrapper">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="dropdown-search-input"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div className="dropdown-options-list">
            {filteredOptions.length === 0 ? (
              <div className="no-options">No matches found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    className={`dropdown-option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="option-info">
                      <div className="option-primary">
                        {opt.badge && <span className="option-badge">{opt.badge}</span>}
                        <span className="option-label">{opt.label}</span>
                      </div>
                      {opt.sublabel && (
                        <span className="option-sublabel">{opt.sublabel}</span>
                      )}
                    </div>
                    {isSelected && <Check size={15} className="check-icon" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

