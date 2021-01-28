// <copyright file="error-message.tsx" company="Microsoft">
// Copyright (c) Microsoft. All rights reserved.
// </copyright>

import * as React from "react";
import { Text } from "@fluentui/react-northstar";
import { useTranslation } from "react-i18next";

interface IErrorMessageProps {
    errorMessage: string;
}

/**
* Component for rendering error message text.
*/
const ErrorMessage: React.FunctionComponent<IErrorMessageProps> = props => {
    const localize = useTranslation().t;

    /**
    * Renders the component.
    */
    return (
        <div >
            {props.errorMessage &&
                <Text content={localize(props.errorMessage)} className="field-error-message" error size="medium" />
            }
        </div>
    );
}

export default ErrorMessage;