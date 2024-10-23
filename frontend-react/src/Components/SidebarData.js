import React from 'react'
import HomeIcon from '@mui/icons-material/Home';
import UploadIcon from '@mui/icons-material/Upload';
import HistoryIcon from '@mui/icons-material/History';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import LogoutIcon from '@mui/icons-material/Logout';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import PermIdentityIcon from '@mui/icons-material/PermIdentity';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DescriptionIcon from '@mui/icons-material/Description';

export const SidebarData = [
    {
        title: "Home",
        icon: <HomeIcon />,
        link: "/homePage"
    },
    {
        title: "Convert",
        icon: <UploadIcon />,
        link: "/convertPage"
    },
    {
        title: "DO Database",
        icon: <LocalShippingIcon />,
        link: "/DOPage"
    },
    {
        title: "GR Database",
        icon: <DescriptionIcon />,
        link: "/GRPage"
    },
    {
        title: "History",
        icon: <HistoryIcon />,
        link: "/historyPage"
    },
    {
        title: "My Profile/Account",
        icon: <AccountBoxIcon />,
        link: "/myProfilePage"
    },
    {
        title: "Manage Account",
        icon: <ManageAccountsIcon />,
        link: "/manageAccountPage"
    },
    {
        title: "Manage Information",
        icon: <PermIdentityIcon />,
        link: "/manageInformationPage"
    },
    {
        title: "Logout",
        icon: <LogoutIcon />,
        link: "/loginPage"
    }
]
