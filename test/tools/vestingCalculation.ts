
function calculatePartPayment(lockupPeriod: number, fullPeriod: number, fullAmount: number, lockupAmount: number, vestPeriod: number) {
    const numberOfPartPayments = Math.floor((fullPeriod - lockupPeriod) / vestPeriod);
    return Math.floor((fullAmount - lockupAmount) / numberOfPartPayments);
}

export function calculateLockedAmount(time: number, startDate: number, lockupPeriod: number, fullPeriod: number, fullAmount: number, lockupAmount: number, vestPeriod: number) {
    const initDate = new Date(startDate * 1000);
    let tempDate = initDate;

    let temp = initDate.getMonth() + lockupPeriod;
    const lockupDate = new Date(tempDate.setFullYear(initDate.getFullYear() + Math.floor(temp / 12), temp % 12));

    tempDate = initDate;
    temp = initDate.getMonth() + fullPeriod;
    const finishDate = new Date(tempDate.setFullYear(initDate.getFullYear() + Math.floor(temp / 12), temp % 12));

    const currentTime = new Date(time * 1000);

    if (Math.floor(currentTime.getTime() / 1000) >= Math.floor(finishDate.getTime() / 1000)) {
        return 0;
    }

    if (Math.floor(currentTime.getTime() / 1000) < Math.floor(lockupDate.getTime() / 1000)) {
        return fullAmount;
    }

    let lockedAmount = fullAmount - lockupAmount;
    const partPayment = calculatePartPayment(lockupPeriod, fullPeriod, fullAmount, lockupAmount, vestPeriod);

    temp = lockupDate.getMonth() + vestPeriod;
    const indexTime = new Date(lockupDate.setFullYear(lockupDate.getFullYear() + Math.floor(temp / 12), temp % 12));

    while (Math.floor(indexTime.getTime() / 1000) < Math.floor(currentTime.getTime() / 1000)) {
        lockedAmount -= partPayment;
        temp = indexTime.getMonth() + vestPeriod;
        indexTime.setFullYear(indexTime.getFullYear() + Math.floor(temp / 12), temp % 12);
    }
    return lockedAmount;
}