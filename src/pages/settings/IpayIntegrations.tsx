import { gql } from '@apollo/client'
import { generatePath } from 'react-router'

import { Button } from '~/components/designSystem/Button'
import { Popper } from '~/components/designSystem/Popper'
import { Tooltip } from '~/components/designSystem/Tooltip'
import { IntegrationsPage } from '~/components/layouts/Integrations'
import { MainHeader } from '~/components/MainHeader/MainHeader'
import { useAddIpayDialog } from '~/components/settings/integrations/AddIpayDialog'
import { useDeleteIpayIntegrationDialog } from '~/components/settings/integrations/DeleteIpayIntegrationDialog'
import { IntegrationsTabsOptionsEnum } from '~/core/constants/tabsOptions'
import { INTEGRATIONS_ROUTE, IPAY_INTEGRATION_DETAILS_ROUTE, useNavigate } from '~/core/router'
import {
  DeleteIpayIntegrationDialogFragmentDoc,
  IpayIntegrationDetailsFragmentDoc,
  IpayProvider,
  ProviderTypeEnum,
  useGetIpayIntegrationsListQuery,
} from '~/generated/graphql'
import { useInternationalization } from '~/hooks/core/useInternationalization'
import { usePermissions } from '~/hooks/usePermissions'
import Ipay from '~/public/images/ipay.svg'
import { MenuPopper, PopperOpener } from '~/styles'

gql`
  fragment IpayIntegrations on IpayProvider {
    id
    name
    code
  }

  query getIpayIntegrationsList($limit: Int, $type: ProviderTypeEnum) {
    paymentProviders(limit: $limit, type: $type) {
      collection {
        ... on IpayProvider {
          id
          ...IpayIntegrations
          ...IpayIntegrationDetails
          ...DeleteIpayIntegrationDialog
        }
      }
    }
  }

  ${DeleteIpayIntegrationDialogFragmentDoc}
  ${IpayIntegrationDetailsFragmentDoc}
`

const IpayIntegrations = () => {
  const navigate = useNavigate()
  const { translate } = useInternationalization()
  const { openAddIpayDialog } = useAddIpayDialog()
  const { openDeleteIpayIntegrationDialog } = useDeleteIpayIntegrationDialog()
  const { hasPermissions } = usePermissions()

  const { data, loading } = useGetIpayIntegrationsListQuery({
    variables: { limit: 1000, type: ProviderTypeEnum.Ipay },
  })
  const connections = data?.paymentProviders?.collection?.filter(
    (provider) => provider.__typename === 'IpayProvider',
  ) as IpayProvider[] | undefined
  const deleteDialogCallback =
    connections && connections.length === 1
      ? () =>
          navigate(
            generatePath(INTEGRATIONS_ROUTE, {
              integrationGroup: IntegrationsTabsOptionsEnum.Community,
            }),
          )
      : undefined

  const canCreateIntegration = hasPermissions(['organizationIntegrationsCreate'])
  const canEditIntegration = hasPermissions(['organizationIntegrationsUpdate'])
  const canDeleteIntegration = hasPermissions(['organizationIntegrationsDelete'])

  return (
    <>
      <MainHeader.Configure
        breadcrumb={[
          {
            label: translate('text_62b1edddbf5f461ab9712750'),
            path: generatePath(INTEGRATIONS_ROUTE, {
              integrationGroup: IntegrationsTabsOptionsEnum.Community,
            }),
          },
        ]}
        entity={{
          viewName: translate('text_17931141481664aoggezsxhi'),
          viewNameLoading: loading,
          metadata: translate('text_62b1edddbf5f461ab971271f'),
          metadataLoading: loading,
          badges: [{ type: 'default', label: translate('text_634ea0ecc6147de10ddb662d') }],
          icon: <Ipay />,
        }}
        actions={{
          items: [
            {
              type: 'action',
              label: translate('text_65846763e6140b469140e235'),
              variant: 'primary',
              hidden: !canCreateIntegration,
              onClick: () => {
                openAddIpayDialog()
              },
            },
          ],
          loading,
        }}
      />

      <IntegrationsPage.Container>
        <section>
          <IntegrationsPage.Headline label={translate('text_65846763e6140b469140e239')} />

          {loading &&
            [1, 2].map((i) => <IntegrationsPage.ItemSkeleton key={`item-skeleton-item-${i}`} />)}

          {!loading &&
            connections?.map((connection, index) => {
              return (
                <IntegrationsPage.ListItem
                  key={`ipay-connection-${index}`}
                  to={generatePath(IPAY_INTEGRATION_DETAILS_ROUTE, {
                    integrationId: connection.id,
                    integrationGroup: IntegrationsTabsOptionsEnum.Community,
                  })}
                  label={connection.name}
                  subLabel={connection.code}
                >
                  {(canEditIntegration || canDeleteIntegration) && (
                    <Popper
                      PopperProps={{ placement: 'bottom-end' }}
                      opener={({ isOpen }) => (
                        <PopperOpener className="right-0 md:right-0">
                          <Tooltip
                            placement="top-end"
                            disableHoverListener={isOpen}
                            title={translate('text_626162c62f790600f850b7b6')}
                          >
                            <Button
                              icon="dots-horizontal"
                              variant="quaternary"
                              data-test="plan-item-options"
                            />
                          </Tooltip>
                        </PopperOpener>
                      )}
                    >
                      {({ closePopper }) => (
                        <MenuPopper>
                          {canEditIntegration && (
                            <Button
                              startIcon="pen"
                              variant="quaternary"
                              align="left"
                              onClick={() => {
                                openAddIpayDialog({
                                  provider: connection,
                                  deleteCallback: deleteDialogCallback,
                                })
                                closePopper()
                              }}
                            >
                              {translate('text_65845f35d7d69c3ab4793dac')}
                            </Button>
                          )}

                          {canDeleteIntegration && (
                            <Button
                              startIcon="trash"
                              variant="quaternary"
                              align="left"
                              onClick={() => {
                                openDeleteIpayIntegrationDialog({
                                  provider: connection,
                                  callback: deleteDialogCallback,
                                })
                                closePopper()
                              }}
                            >
                              {translate('text_65845f35d7d69c3ab4793dad')}
                            </Button>
                          )}
                        </MenuPopper>
                      )}
                    </Popper>
                  )}
                </IntegrationsPage.ListItem>
              )
            })}
        </section>
      </IntegrationsPage.Container>
    </>
  )
}

export default IpayIntegrations
