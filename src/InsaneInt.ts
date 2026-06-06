export class InsaneInt {
	startingECount: number
	coefficient: number
	exponent: number

	constructor(startingECount: number, coefficient: number, exponent: number) {
		this.startingECount = startingECount
		this.coefficient = coefficient
		this.exponent = exponent
	}

	static fromString(val: string | InsaneInt) {
		if (val instanceof InsaneInt) {
			return new InsaneInt(val.startingECount, val.coefficient, val.exponent)
		}

		let rawValue = val
		let startingECount = 0
		while (rawValue.startsWith('e')) {
			startingECount += 1
			rawValue = rawValue.slice(1)
		}

		let coefficient: number
		let exponent: number

		if (rawValue.includes('e')) {
			if (rawValue.includes('#')) {
				const [rawCoefficient, rawECount] = rawValue.split('#')
				startingECount += Number(rawECount)
				rawValue = rawCoefficient
			}
			;[coefficient, exponent] = rawValue.split('e').map(Number)
		} else {
			coefficient = Number(rawValue)
			exponent = 0
		}

		return new InsaneInt(startingECount, coefficient, exponent)
	}

	toString() {
		let result = 'e'.repeat(this.startingECount)
		result += this.coefficient

		if (this.exponent !== 0) {
			result += `e${this.exponent}`
		}

		return result
	}

	greaterThan(other: InsaneInt) {
		if (this.startingECount !== other.startingECount) {
			return this.startingECount > other.startingECount
		}

		if (this.exponent !== other.exponent) {
			return this.exponent > other.exponent
		}

		return this.coefficient > other.coefficient
	}

	equalTo(other: InsaneInt) {
		return (
			this.startingECount === other.startingECount &&
			this.exponent === other.exponent &&
			this.coefficient === other.coefficient
		)
	}

	lessThan(other: InsaneInt) {
		return !this.equalTo(other) && !this.greaterThan(other)
	}

	isBalanced(): boolean {
		// Wrong 0s
		if (
			this.coefficient === 0 &&
			(this.exponent !== 0 || this.startingECount !== 0)
		) {
			return false
		}
		if (this.exponent === 0 && this.startingECount !== 0) {
			return false
		}

		// Improper balancing
		if (
			(this.coefficient >= 10 && this.exponent > 0) ||
			this.coefficient >= 10000000
		) {
			return false
		}
		if (this.coefficient < 1 && this.exponent > 0) {
			return false
		}
		if (this.exponent >= 10000000) {
			return false
		}

		// Decimals in exponents, or leading zeros
		if (this.exponent % 1 !== 0 || this.startingECount % 1 !== 0) {
			return false
		}

		return true
	}

	balance() {
		while (!this.isBalanced()) {
			if (this.coefficient === 0) {
				this.exponent = 0
				this.startingECount = 0
				return
			}

			// Ensure exponent is an integer
			if (this.startingECount > 0 && this.exponent % 1 !== 0) {
				const previousECount = this.startingECount
				this.startingECount = Math.max(this.startingECount - 1, 0)
				this.exponent *= 10 ** (previousECount - this.startingECount)
			}
			if (this.exponent % 1 !== 0) {
				this.coefficient *= 1 / (this.exponent % 1)
				this.exponent = Math.floor(this.exponent)
			}

			// Balance coefficient and exponent
			if (
				(this.coefficient >= 10 && this.exponent > 0) ||
				this.coefficient >= 10000000
			) {
				const change = Math.floor(this.coefficient).toString().length - 1
				this.coefficient /= 10 ** change
				this.exponent += change
			}

			if (this.coefficient < 1 && this.exponent > 0) {
				let change = Math.ceil(Math.log10(1 / this.coefficient))
				if (change >= this.exponent) {
					change = this.exponent - 1
				}
				this.coefficient *= 10 ** change
				this.exponent -= change / 10 ** this.startingECount
			}

			// Balance exponent and startingECount
			if (
				(this.exponent >= 100000 && this.startingECount > 0) ||
				this.exponent >= 10000000
			) {
				const change = Math.floor(this.exponent).toString().length - 5
				this.exponent /= 10 ** change
				this.startingECount += change
			}
			if (
				this.exponent !== 0 &&
				this.exponent < 10000 &&
				this.startingECount !== 0
			) {
				let change = 5 - Math.floor(this.exponent).toString().length
				if (change >= this.startingECount) {
					change = this.startingECount - 1
				}
				this.exponent *= 10 ** change
				this.startingECount -= change
			}
		}
	}

	add(other: InsaneInt) {
		// Balance the numbers
		this.balance()
		other.balance()

		// Make the exponents the same
		let startingECount: number
		let coefficient: number
		let exponent: number

		const myStartingECount = this.startingECount
		const myCoefficient = this.coefficient
		let myExponent = this.exponent

		const otherStartingECount = other.startingECount
		const otherCoefficient = other.coefficient
		let otherExponent = other.exponent

		if (myStartingECount > otherStartingECount) {
			otherExponent /= 10 ** (myStartingECount - otherStartingECount)
			startingECount = myStartingECount
		} else if (myStartingECount < otherStartingECount) {
			myExponent /= 10 ** (otherStartingECount - myStartingECount)
			startingECount = otherStartingECount
		} else {
			startingECount = myStartingECount
		}

		if (myExponent > otherExponent) {
			coefficient =
				otherCoefficient / 10 ** (myExponent - otherExponent) + myCoefficient
			exponent = myExponent
		} else if (myExponent < otherExponent) {
			coefficient =
				myCoefficient / 10 ** (otherExponent - myExponent) + otherCoefficient
			exponent = otherExponent
		} else {
			coefficient = myCoefficient + otherCoefficient
			exponent = myExponent
		}

		const result = new InsaneInt(startingECount, coefficient, exponent)
		result.balance()
		return result
	}

	div(other: InsaneInt) {
		// Balance the numbers
		this.balance()
		other.balance()

		if (other.coefficient === 0) {
			return new InsaneInt(0, 0, 0)
		}

		let startingECount = this.startingECount
		const coefficient = this.coefficient / other.coefficient
		let exponent = this.exponent

		if (startingECount > other.startingECount) {
			exponent -= other.exponent / 10 ** (startingECount - other.startingECount)
			startingECount = this.startingECount
		} else if (startingECount < other.startingECount) {
			exponent =
				exponent / 10 ** (other.startingECount - startingECount) -
				other.exponent
			startingECount = other.startingECount
		} else {
			exponent -= other.exponent
		}

		const result = new InsaneInt(startingECount, coefficient, exponent)
		result.balance()
		return result
	}
}

const isFiniteInsaneInt = (value: InsaneInt) =>
	Number.isFinite(value.startingECount) &&
	Number.isFinite(value.coefficient) &&
	Number.isFinite(value.exponent)

export const parseFiniteInsaneInt = (value: string | InsaneInt) => {
	if (typeof value === 'string') {
		const trimmedValue = value.trim()
		if (trimmedValue.length === 0) {
			return null
		}

		const parsed = InsaneInt.fromString(trimmedValue)
		return isFiniteInsaneInt(parsed) ? parsed : null
	}

	const parsed = InsaneInt.fromString(value)
	return isFiniteInsaneInt(parsed) ? parsed : null
}
