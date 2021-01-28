// <copyright file="StorageSettings.cs" company="Microsoft">
// Copyright (c) Microsoft. All rights reserved.
// </copyright>

namespace Microsoft.Teams.Apps.LearnNow.Models.Configuration
{
    /// <summary>
    /// A class which helps to provide storage settings.
    /// </summary>
    public class StorageSettings
    {
        /// <summary>
        /// Gets or sets storage connection string.
        /// </summary>
        public string TableStorageConnectionString { get; set; }

        /// <summary>
        /// Gets or sets Azure Blob Storage connection string.
        /// </summary>
        public string BlobConnectionString { get; set; }
    }
}
