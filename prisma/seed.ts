import { PrismaClient, CommissionType } from '@/app/generated/prisma';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
    // Create a fake user
    // const user = await prisma.user.create({
    //     data: {
    //         id: faker.string.uuid(),
    //         fname: faker.person.firstName(),
    //         lname: faker.person.lastName(),
    //         email: faker.internet.email(),
    //         username: faker.internet.username(),
    //         password: faker.internet.password({ length: 12 }),
    //         permissions: 'agent', // Or faker.helpers.arrayElement(['owner', 'admin', 'agent'])
    //     },
    // });

    const thisYear = new Date().getFullYear();
    const start = new Date(thisYear, 0, 1);   // Jan 1 of this year
    const end = new Date(thisYear, 11, 31);   // Dec 31 of this year

    // Create multiple fake leases
    for (let i = 0; i < 100; i++) {
        const date = faker.date.between({ from: start, to: end });

        await prisma.lease.create({
            data: {
                moveInDate: date,
                invoiceNumber: `INV-${faker.number.int({ min: 1000, max: 9999 })}`,
                complex: faker.location.city(),
                tenantFname: faker.person.firstName(),
                tenantLname: faker.person.lastName(),
                apartmentNumber: faker.string.alphanumeric(3).toUpperCase(),
                rentAmount: faker.number.float({ min: 800, max: 2500, fractionDigits: 2 }),
                commissionType: faker.helpers.arrayElement([
                    CommissionType.percent,
                    CommissionType.flat,
                ]),
                commissionPercent: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
                commission: faker.number.float({ min: 50, max: 500, fractionDigits: 2 }),
                createdAt: date,
                // userId: user.id,
                userId: "ff17a0ef-42ae-4e18-8bc5-5be06f8e19c6"
            },
        });
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
