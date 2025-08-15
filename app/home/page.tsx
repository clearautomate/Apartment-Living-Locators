import { withUser } from '@/lib/withUser';

export default async function Home() {
    const user = await withUser();

    return <></>
}