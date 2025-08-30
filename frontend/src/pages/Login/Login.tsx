import React from "react";
import { SignedIn, UserButton } from '@clerk/clerk-react';


export const Login: React.FC = () => {
    return (
        <header>
            <SignedIn>
                <UserButton />
            </SignedIn>
        </header>
    )
}
